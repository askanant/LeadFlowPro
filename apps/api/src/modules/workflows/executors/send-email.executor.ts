import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';
import nodemailer from 'nodemailer';
import { LoggerService } from '../../../shared/services/logger.service';

// SMTP transport is created lazily when env vars are available
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export class SendEmailExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { tenantId, leadId } = context;
      const { subject, body, templateId, recipientEmail } = config;

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      const toEmail = recipientEmail || lead.email;
      if (!toEmail) {
        return { success: false, error: 'No recipient email available' };
      }

      // Interpolate variables in subject/body
      const vars: Record<string, string> = {
        '{{firstName}}': lead.firstName || '',
        '{{lastName}}': lead.lastName || '',
        '{{email}}': lead.email || '',
        '{{phone}}': lead.phone || '',
        '{{status}}': lead.status,
      };

      let finalSubject = subject || 'Notification from LeadFlowPro';
      let finalBody = body || '';

      for (const [key, val] of Object.entries(vars)) {
        finalSubject = finalSubject.replaceAll(key, val);
        finalBody = finalBody.replaceAll(key, val);
      }

      // Try real SMTP delivery first
      const transport = createTransport();
      let deliveryStatus: 'sent' | 'pending' = 'pending';
      let messageId: string | undefined;

      if (transport) {
        try {
          const info = await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: toEmail,
            subject: finalSubject,
            html: finalBody,
            text: finalBody.replace(/<[^>]*>/g, ''),
          });
          deliveryStatus = 'sent';
          messageId = info.messageId;
          LoggerService.logInfo('SendEmailExecutor: email sent via SMTP', {
            to: toEmail,
            messageId,
          });
        } catch (smtpError) {
          LoggerService.logWarn('SendEmailExecutor: SMTP delivery failed, falling back to notification record', {
            error: smtpError instanceof Error ? smtpError.message : 'Unknown',
          });
        }
      }

      // Create notification record (also serves as fallback when SMTP is not configured)
      const notification = await prisma.notification.create({
        data: {
          tenantId,
          type: 'workflow_execution',
          channel: 'email',
          subject: finalSubject,
          message: finalBody,
          recipients: [toEmail],
          status: deliveryStatus,
          metadata: {
            leadId,
            workflowId: context.workflowId,
            executionId: context.executionId,
            templateId,
            messageId,
          },
        },
      });

      return {
        success: true,
        data: {
          notificationId: notification.id,
          to: toEmail,
          subject: finalSubject,
          deliveryStatus,
          messageId,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      LoggerService.logError('SendEmailExecutor failed', undefined, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
