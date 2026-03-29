import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { LoggerService } from '../../../shared/services/logger.service';

export class SendWebhookExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId, tenantId } = context;
      const { url, method = 'POST', headers = {}, includeLeadData = true } = config;

      if (!url || typeof url !== 'string') {
        return { success: false, error: 'Webhook URL is required' };
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return { success: false, error: 'Invalid webhook URL format' };
      }

      // Block private/internal URLs to prevent SSRF
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.') ||
        hostname === '169.254.169.254'
      ) {
        return { success: false, error: 'Webhook URL cannot point to internal/private addresses' };
      }

      let payload: Record<string, any> = {
        event: 'workflow_execution',
        workflowId: context.workflowId,
        executionId: context.executionId,
        timestamp: new Date().toISOString(),
      };

      if (includeLeadData) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (lead) {
          payload.lead = {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            status: lead.status,
            qualityScore: lead.qualityScore,
          };
        }
      }

      const allowedMethods = ['POST', 'PUT', 'PATCH'];
      const httpMethod = allowedMethods.includes(method.toUpperCase()) ? method.toUpperCase() : 'POST';

      const response = await fetch(parsedUrl.toString(), {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-LeadFlowPro-Event': 'workflow_execution',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      LoggerService.logInfo('SendWebhookExecutor: sent webhook', {
        url: parsedUrl.origin + parsedUrl.pathname,
        status: response.status,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Webhook returned HTTP ${response.status}`,
          data: { statusCode: response.status },
        };
      }

      return {
        success: true,
        data: { statusCode: response.status, url: parsedUrl.origin + parsedUrl.pathname },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      LoggerService.logError('SendWebhookExecutor failed', undefined, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
