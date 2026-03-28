import { Router, Request, Response, raw } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config';
import { leadsService } from '../leads/leads.service';
import { billingService } from '../billing/billing.service';
import { prisma } from '../../shared/database/prisma';
import { stripeService } from '../billing/stripe.service';

const s3 = config.S3_BUCKET_RECORDINGS
  ? new S3Client({ region: config.AWS_REGION })
  : null;

export const webhooksRouter = Router();

// ─── Stripe Webhooks ──────────────────────────────────────────────────────────

// POST — Stripe webhook for subscription events (checkout, payment, cancellation)
webhooksRouter.post(
  '/stripe',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      if (!config.STRIPE_WEBHOOK_SECRET) {
        console.warn('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(400).json({ error: 'Webhook secret not configured' });
      }

      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      // Verify and construct the event
      if (!config.STRIPE_SECRET_KEY) {
        return res.status(400).json({ error: 'Stripe not configured' });
      }

      const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: '2026-02-25.clover',
      });

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          config.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }

      // Handle the event
      await stripeService.handleWebhookEvent(event);

      // Return a success response
      res.json({ received: true, eventId: event.id });
    } catch (error) {
      console.error('Stripe webhook processing error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

// ─── Meta Ads Webhooks ────────────────────────────────────────────────────────

// GET — Meta webhook verification challenge
webhooksRouter.get('/meta/:tenantId', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.META_WEBHOOK_VERIFY_TOKEN) {
    console.log(`✅ Meta webhook verified for tenant ${req.params['tenantId']}`);
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST — Meta lead webhook
webhooksRouter.post('/meta/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  // Verify Meta signature
  if (config.META_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    if (signature && rawBody) {
      const expected = `sha256=${crypto
        .createHmac('sha256', config.META_APP_SECRET)
        .update(rawBody)
        .digest('hex')}`;

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.warn(`❌ Invalid Meta webhook signature for tenant ${tenantId}`);
        return res.sendStatus(403);
      }
    }
  }

  // Respond 200 immediately — Meta requires fast response
  res.sendStatus(200);

  try {
    const body = req.body as {
      entry?: Array<{
        changes?: Array<{
          field: string;
          value: { leadgen_id: string; page_id: string };
        }>;
      }>;
    };

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'leadgen') {
          await processMetaLead(tenantId, change.value.leadgen_id);
        }
      }
    }
  } catch (err) {
    console.error('Meta webhook processing error:', err);
  }
});

async function processMetaLead(tenantId: string, leadgenId: string) {
  // Check billing quota before ingesting lead
  const canStore = await billingService.canStoreLead(tenantId, undefined);
  if (!canStore) {
    console.warn(`⚠️  Lead quota exceeded for tenant ${tenantId} — skipping Meta lead ${leadgenId}`);
    return;
  }

  const creds = await prisma.adPlatformCredential.findFirst({
    where: { tenantId, platform: 'meta', isValid: true },
  });

  if (!creds?.accessToken) {
    console.error(`No valid Meta credentials for tenant ${tenantId}`);
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${leadgenId}?fields=field_data,created_time&access_token=${creds.accessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Failed to fetch Meta lead ${leadgenId}:`, await response.text());
    return;
  }

  const leadData = (await response.json()) as {
    field_data: { name: string; values: string[] }[];
    created_time: string;
  };

  // Flatten field_data array into a key/value map
  const fields: Record<string, string> = {};
  for (const field of leadData.field_data ?? []) {
    fields[field.name] = field.values[0] ?? '';
  }

  const campaign = await prisma.campaign.findFirst({
    where: { tenantId, platform: 'meta', status: 'active' },
  });

  const { lead, duplicate } = await leadsService.ingestLead(tenantId, {
    platform: 'meta',
    platformLeadId: leadgenId,
    campaignId: campaign?.id,
    firstName: fields['first_name'] || fields['full_name']?.split(' ')[0],
    lastName: fields['last_name'] || fields['full_name']?.split(' ').slice(1).join(' '),
    email: fields['email'],
    phone: fields['phone_number'] || fields['phone'],
    city: fields['city'],
    state: fields['state'],
    customFields: fields,
  });

  if (duplicate) {
    console.log(`⚠️  Duplicate Meta lead ${leadgenId} skipped`);
    return;
  }

  console.log(`✅ Ingested Meta lead ${leadgenId} → ${lead.id} for tenant ${tenantId}`);

  // Trigger WhatsApp delivery (fire and forget)
  deliverLeadViaWhatsApp(tenantId, lead).catch((err) =>
    console.error('WhatsApp delivery error:', err)
  );
}

async function deliverLeadViaWhatsApp(tenantId: string, lead: any) {
  if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_SYSTEM_USER_TOKEN) {
    console.log('WhatsApp not configured — skipping delivery');
    return;
  }

  const company = await prisma.company.findUnique({
    where: { tenantId },
    select: { settings: true },
  });

  const settings = company?.settings as Record<string, any> | null;
  const whatsappNumber = settings?.['whatsappDeliveryNumber'];
  if (!whatsappNumber) {
    console.log(`No WhatsApp delivery number configured for tenant ${tenantId}`);
    return;
  }

  // Create delivery record
  const delivery = await prisma.leadDelivery.create({
    data: {
      tenantId,
      leadId: lead.id,
      channel: 'whatsapp',
      status: 'pending',
    },
  });

  const payload = {
    messaging_product: 'whatsapp',
    to: whatsappNumber,
    type: 'template',
    template: {
      name: 'new_lead_notification',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'N/A' },
            { type: 'text', text: lead.phone ?? 'N/A' },
            { type: 'text', text: lead.email ?? 'N/A' },
          ],
        },
      ],
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_SYSTEM_USER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();
  const success = response.ok;

  await prisma.leadDelivery.update({
    where: { id: delivery.id },
    data: {
      status: success ? 'delivered' : 'failed',
      deliveredAt: success ? new Date() : undefined,
      deliveryLog: result as any,
    },
  });

  console.log(`📱 WhatsApp delivery ${success ? '✅' : '❌'} for lead ${lead.id}`);
}

// ─── Shared recording upload helper ──────────────────────────────────────────

async function uploadRecordingToS3(
  recordingUrl: string,
  callSid: string,
  tenantId: string | undefined,
  authHeader?: string, // pass Basic auth for Twilio; Exotel URLs are public
): Promise<string> {
  if (!s3 || !config.S3_BUCKET_RECORDINGS) return recordingUrl;

  const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};
  const audioRes = await fetch(recordingUrl, { headers });
  if (!audioRes.ok) return recordingUrl;

  const dateStr = new Date().toISOString().split('T')[0]!;
  const key = `recordings/${tenantId ?? 'unknown'}/${dateStr}/${callSid}.mp3`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET_RECORDINGS,
      Key: key,
      Body: Buffer.from(await audioRes.arrayBuffer()),
      ContentType: 'audio/mpeg',
    }),
  );

  console.log(`📼 Recording uploaded to S3: ${key}`);
  return `https://${config.S3_BUCKET_RECORDINGS}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
}

// ─── Twilio Webhooks ──────────────────────────────────────────────────────────

// POST — Inbound call (Twilio posts here when call arrives)
webhooksRouter.post('/twilio/voice/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { From, To, CallSid } = req.body as Record<string, string>;

  const phoneNumber = await prisma.phoneNumber.findFirst({
    where: { tenantId, number: To, isActive: true },
  });

  if (phoneNumber) {
    await prisma.callLog.upsert({
      where: { callSid: CallSid },
      create: {
        tenantId,
        phoneNumberId: phoneNumber.id,
        callSid: CallSid,
        fromNumber: From,
        toNumber: To,
        direction: 'inbound',
        status: 'ringing',
        startedAt: new Date(),
      },
      update: { status: 'ringing' },
    });
  }

  const forwardTo = phoneNumber?.forwardTo ?? '';
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${To}" record="record-from-ringing" recordingStatusCallback="/api/v1/webhooks/twilio/recording">
    <Number>${forwardTo}</Number>
  </Dial>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

// POST — Twilio call status callback
webhooksRouter.post('/twilio/status/:tenantId', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body as Record<string, string>;

  await prisma.callLog.updateMany({
    where: { callSid: CallSid },
    data: {
      status: CallStatus,
      durationSeconds: CallDuration ? parseInt(CallDuration) : undefined,
      endedAt: new Date(),
    },
  });

  res.sendStatus(200);
});

// POST — Twilio recording ready callback
webhooksRouter.post('/twilio/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body as Record<string, string>;

  let finalRecordingUrl = `${RecordingUrl}.mp3`;

  try {
    const callLog = await prisma.callLog.findFirst({ where: { callSid: CallSid } });
    // Twilio recording URLs require Basic auth to download
    const twilioAuth =
      config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN
        ? `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64')}`
        : undefined;
    finalRecordingUrl = await uploadRecordingToS3(
      `${RecordingUrl}.mp3`,
      CallSid,
      callLog?.tenantId,
      twilioAuth,
    );
  } catch (err) {
    console.error('S3 recording upload failed, using Twilio URL:', err);
  }

  await prisma.callLog.updateMany({
    where: { callSid: CallSid },
    data: {
      recordingUrl: finalRecordingUrl,
      durationSeconds: RecordingDuration ? parseInt(RecordingDuration) : undefined,
    },
  });

  const callLog = await prisma.callLog.findFirst({ where: { callSid: CallSid } });
  if (callLog) await matchCallToLead(callLog);

  res.sendStatus(200);
});

// ─── Exotel Webhooks ──────────────────────────────────────────────────────────
// Field name differences vs Twilio:
//   Status (not CallStatus) | Duration (not CallDuration) | no auth needed on recordings

// POST — Exotel inbound call passthrough
webhooksRouter.post('/exotel/voice/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { CallSid, From, To } = req.body as Record<string, string>;

  const phoneNumber = await prisma.phoneNumber.findFirst({
    where: { tenantId, number: To, isActive: true },
  });

  if (phoneNumber) {
    await prisma.callLog.upsert({
      where: { callSid: CallSid },
      create: {
        tenantId,
        phoneNumberId: phoneNumber.id,
        callSid: CallSid,
        fromNumber: From,
        toNumber: To,
        direction: 'inbound',
        status: 'ringing',
        startedAt: new Date(),
      },
      update: { status: 'ringing' },
    });
  }

  const forwardTo = phoneNumber?.forwardTo ?? '';
  const recordingCallback = `${config.BASE_URL}/api/v1/webhooks/exotel/recording`;

  // Exotel uses the same TwiML-compatible XML format
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="true" recordingStatusCallback="${recordingCallback}">
    <Number>${forwardTo}</Number>
  </Dial>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(xml);
});

// POST — Exotel call status callback
webhooksRouter.post('/exotel/status/:tenantId', async (req: Request, res: Response) => {
  // Exotel uses 'Status' and 'Duration' (Twilio uses 'CallStatus' and 'CallDuration')
  const { CallSid, Status, Duration } = req.body as Record<string, string>;

  await prisma.callLog.updateMany({
    where: { callSid: CallSid },
    data: {
      status: Status,
      durationSeconds: Duration ? parseInt(Duration) : undefined,
      endedAt: new Date(),
    },
  });

  res.sendStatus(200);
});

// POST — Exotel recording ready callback
webhooksRouter.post('/exotel/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body as Record<string, string>;

  let finalRecordingUrl = RecordingUrl; // Exotel URLs already include .mp3

  try {
    const callLog = await prisma.callLog.findFirst({ where: { callSid: CallSid } });
    // Exotel recording URLs are publicly accessible — no Basic auth needed
    finalRecordingUrl = await uploadRecordingToS3(RecordingUrl, CallSid, callLog?.tenantId);
  } catch (err) {
    console.error('S3 recording upload failed, using Exotel URL:', err);
  }

  await prisma.callLog.updateMany({
    where: { callSid: CallSid },
    data: {
      recordingUrl: finalRecordingUrl,
      durationSeconds: RecordingDuration ? parseInt(RecordingDuration) : undefined,
    },
  });

  const callLog = await prisma.callLog.findFirst({ where: { callSid: CallSid } });
  if (callLog) await matchCallToLead(callLog);

  res.sendStatus(200);
});

async function matchCallToLead(callLog: {
  id: string;
  tenantId: string;
  fromNumber: string | null;
  startedAt: Date | null;
}) {
  if (!callLog.fromNumber || !callLog.startedAt) return;

  // Search for a lead with the same phone within a 24h window before the call
  const windowStart = new Date(callLog.startedAt.getTime() - 24 * 60 * 60 * 1000);
  const lead = await prisma.lead.findFirst({
    where: {
      tenantId: callLog.tenantId,
      phone: callLog.fromNumber,
      receivedAt: { gte: windowStart, lte: callLog.startedAt },
    },
    orderBy: { receivedAt: 'desc' },
  });

  if (!lead) return;

  // Create match record (ignore if already exists)
  const existing = await prisma.leadCallMatch.findFirst({
    where: { leadId: lead.id, callLogId: callLog.id },
  });

  if (!existing) {
    await prisma.leadCallMatch.create({
      data: { leadId: lead.id, callLogId: callLog.id, confidence: 0.9 },
    });
  }

  // Link lead to call log
  await prisma.callLog.update({
    where: { id: callLog.id },
    data: { leadId: lead.id },
  });

  console.log(`🔗 Matched call ${callLog.id} to lead ${lead.id}`);
}
