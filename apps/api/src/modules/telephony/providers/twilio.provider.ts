import { config } from '../../../config';
import type { AvailableNumber, ITelephonyProvider, ProvisionResult } from './types';

export class TwilioProvider implements ITelephonyProvider {
  readonly name = 'twilio';

  private get base() {
    return `https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}`;
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64')}`;
  }

  private assertCredentials() {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)');
    }
  }

  async searchAvailableNumbers(opts?: { areaCode?: string }): Promise<AvailableNumber[]> {
    this.assertCredentials();

    const params = new URLSearchParams({ SmsEnabled: 'false', VoiceEnabled: 'true', Limit: '20' });
    if (opts?.areaCode) params.set('AreaCode', opts.areaCode);

    const res = await fetch(`${this.base}/AvailablePhoneNumbers/US/Local.json?${params}`, {
      headers: { Authorization: this.authHeader },
    });

    if (!res.ok) {
      const err = (await res.json()) as { message: string };
      throw new Error(`Twilio search failed: ${err.message}`);
    }

    const data = (await res.json()) as {
      available_phone_numbers: Array<{ phone_number: string; friendly_name: string }>;
    };

    return data.available_phone_numbers.map((n) => ({
      number: n.phone_number,
      providerSid: n.phone_number, // Twilio SID is assigned post-purchase; use number as temp ref
      friendlyName: n.friendly_name,
    }));
  }

  async provisionNumber(opts: {
    number: string;
    providerSid?: string;
    tenantId: string;
    forwardTo: string;
  }): Promise<ProvisionResult> {
    this.assertCredentials();

    const voiceUrl = `${config.BASE_URL}/api/v1/webhooks/twilio/voice/${opts.tenantId}`;
    const statusUrl = `${config.BASE_URL}/api/v1/webhooks/twilio/status/${opts.tenantId}`;

    const body = new URLSearchParams({
      PhoneNumber: opts.number,
      VoiceUrl: voiceUrl,
      VoiceMethod: 'POST',
      StatusCallback: statusUrl,
      StatusCallbackMethod: 'POST',
    });

    const res = await fetch(`${this.base}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = (await res.json()) as { message: string };
      throw new Error(`Twilio purchase failed: ${err.message}`);
    }

    const bought = (await res.json()) as { sid: string; phone_number: string };

    return { providerSid: bought.sid, phoneNumber: bought.phone_number };
  }
}
