import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';

/**
 * Send SMS via Twilio REST API (no SDK needed — uses native fetch)
 */
async function sendViaTwilio(to: string, body: string): Promise<{ sid: string } | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return null;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { sid: string };
  return { sid: data.sid };
}

export class SendSmsExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { tenantId, leadId } = context;
      const { message, recipientPhone } = config;

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      const toPhone = recipientPhone || lead.phone;
      if (!toPhone) {
        return { success: false, error: 'No recipient phone number available' };
      }

      if (!message) {
        return { success: false, error: 'SMS message is required' };
      }

      // Interpolate variables
      const vars: Record<string, string> = {
        '{{firstName}}': lead.firstName || '',
        '{{lastName}}': lead.lastName || '',
        '{{status}}': lead.status,
      };

      let finalMessage = message;
      for (const [key, val] of Object.entries(vars)) {
        finalMessage = finalMessage.replaceAll(key, val);
      }

      // Try Twilio delivery first
      let deliveryStatus: 'sent' | 'pending' = 'pending';
      let twilioSid: string | undefined;

      try {
        const result = await sendViaTwilio(toPhone, finalMessage);
        if (result) {
          deliveryStatus = 'sent';
          twilioSid = result.sid;
          console.log('SendSmsExecutor: SMS sent via Twilio', {
            to: toPhone,
            sid: twilioSid,
          });
        }
      } catch (twilioError) {
        console.warn('SendSmsExecutor: Twilio delivery failed, falling back to notification record', {
          error: twilioError instanceof Error ? twilioError.message : 'Unknown',
        });
      }

      // Create notification record (also serves as fallback)
      const notification = await prisma.notification.create({
        data: {
          tenantId,
          type: 'workflow_execution',
          channel: 'sms',
          message: finalMessage,
          recipients: [toPhone],
          status: deliveryStatus,
          metadata: {
            leadId,
            workflowId: context.workflowId,
            executionId: context.executionId,
            twilioSid,
          },
        },
      });

      return {
        success: true,
        data: {
          notificationId: notification.id,
          to: toPhone,
          deliveryStatus,
          twilioSid,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('SendSmsExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
