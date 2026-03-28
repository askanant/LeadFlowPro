import { config } from '../../../config';
import { prisma } from '../../../shared/database/prisma';
import type { AvailableNumber, ITelephonyProvider, ProvisionResult } from './types';

/**
 * Exotel v1 REST API provider (India-first)
 *
 * Key differences from Twilio:
 * - Numbers must be purchased via Exotel dashboard — API only lists/assigns them
 * - Uses an "App" (ExoPhone App) concept to route inbound calls to a webhook URL
 * - India endpoint: api.in.exotel.com  |  Singapore: api.exotel.com
 * - Webhook field names differ slightly (Status vs CallStatus, Duration vs CallDuration)
 */
export class ExotelProvider implements ITelephonyProvider {
  readonly name = 'exotel';

  private get base() {
    // EXOTEL_SUBDOMAIN defaults to 'api.in.exotel.com' (India region)
    return `https://${config.EXOTEL_SUBDOMAIN}/v1/Accounts/${config.EXOTEL_ACCOUNT_SID}`;
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${config.EXOTEL_API_KEY}:${config.EXOTEL_API_TOKEN}`).toString('base64')}`;
  }

  private assertCredentials() {
    if (!config.EXOTEL_API_KEY || !config.EXOTEL_API_TOKEN || !config.EXOTEL_ACCOUNT_SID) {
      throw new Error(
        'Exotel credentials not configured (EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_ACCOUNT_SID)',
      );
    }
  }

  /**
   * Lists numbers already purchased in the Exotel account that aren't yet
   * assigned in LeadFlow (not in the phone_numbers table).
   */
  async searchAvailableNumbers(_opts?: { areaCode?: string }): Promise<AvailableNumber[]> {
    this.assertCredentials();

    const res = await fetch(`${this.base}/IncomingPhoneNumbers.json`, {
      headers: { Authorization: this.authHeader },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Exotel list numbers failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      TwilioResponse?: {
        IncomingPhoneNumbers?: {
          IncomingPhoneNumber?: ExotelPhoneNumber | ExotelPhoneNumber[];
        };
      };
    };

    const raw = data?.TwilioResponse?.IncomingPhoneNumbers?.IncomingPhoneNumber ?? [];
    const all: ExotelPhoneNumber[] = Array.isArray(raw) ? raw : [raw];

    // Filter out numbers already assigned in LeadFlow DB
    const existing = await prisma.phoneNumber.findMany({
      where: { provider: 'exotel' },
      select: { providerSid: true },
    });
    const assignedSids = new Set(existing.map((n) => n.providerSid));

    return all
      .filter((n) => !assignedSids.has(n.Sid))
      .map((n) => ({
        number: n.PhoneNumber,
        providerSid: n.Sid,
        friendlyName: n.FriendlyName ?? n.PhoneNumber,
      }));
  }

  /**
   * Provision flow:
   * 1. Create an Exotel App (passthrough) pointing to the LeadFlow voice webhook
   * 2. Assign the App to the number via VoiceApplicationSid
   */
  async provisionNumber(opts: {
    number: string;
    providerSid?: string;
    tenantId: string;
    forwardTo: string;
  }): Promise<ProvisionResult> {
    this.assertCredentials();

    if (!opts.providerSid) {
      throw new Error('Exotel requires providerSid (number Sid from searchAvailableNumbers)');
    }

    const voiceUrl = `${config.BASE_URL}/api/v1/webhooks/exotel/voice/${opts.tenantId}`;
    const statusUrl = `${config.BASE_URL}/api/v1/webhooks/exotel/status/${opts.tenantId}`;
    const recordingUrl = `${config.BASE_URL}/api/v1/webhooks/exotel/recording`;

    const headers = {
      Authorization: this.authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Step 1 — Create an ExoPhone App with passthrough webhook
    const appBody = new URLSearchParams({
      Url: voiceUrl,
      StatusCallback: statusUrl,
      StatusCallbackEvents: 'terminal',
      RecordingStatusCallback: recordingUrl,
    });

    const appRes = await fetch(`${this.base}/Apps.json`, {
      method: 'POST',
      headers,
      body: appBody.toString(),
    });

    if (!appRes.ok) {
      const text = await appRes.text();
      throw new Error(`Exotel App creation failed (${appRes.status}): ${text}`);
    }

    const appData = (await appRes.json()) as {
      TwilioResponse?: { App?: { Sid: string } };
    };

    const appSid = appData?.TwilioResponse?.App?.Sid;
    if (!appSid) throw new Error('Exotel App creation returned no Sid');

    // Step 2 — Assign the App to the phone number
    const numBody = new URLSearchParams({ VoiceApplicationSid: appSid });

    const numRes = await fetch(`${this.base}/IncomingPhoneNumbers/${opts.providerSid}.json`, {
      method: 'POST',
      headers,
      body: numBody.toString(),
    });

    if (!numRes.ok) {
      const text = await numRes.text();
      throw new Error(`Exotel number assignment failed (${numRes.status}): ${text}`);
    }

    return { providerSid: opts.providerSid, phoneNumber: opts.number };
  }
}

interface ExotelPhoneNumber {
  Sid: string;
  PhoneNumber: string;
  FriendlyName?: string;
  VoiceApplicationSid?: string | null;
}
