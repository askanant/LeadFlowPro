import { ITriggerExecutor, TriggerExecutionContext, WebhookTriggerConfig } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';
import crypto from 'crypto';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Handles webhook-based workflow triggers with signature validation
 */
export class WebhookTriggerExecutor implements ITriggerExecutor {
  /**
   * Execute webhook trigger
   */
  async execute(config: WebhookTriggerConfig, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;

    // Get webhook payload from metadata
    const { payload, signature, eventType } = metadata || {};

    if (!payload) {
      throw new Error('Webhook payload is required');
    }

    // Validate webhook signature if secret is configured
    if (config.webhookSecret) {
      await this.validateSignature(payload, signature, config.webhookSecret);
    }

    // Check if event type is allowed
    if (config.events && config.events.length > 0 && eventType) {
      if (!config.events.includes(eventType)) {
        LoggerService.logInfo('Webhook event type not allowed', { eventType, allowedEvents: config.events });
        return; // Silently ignore unallowed events
      }
    }

    // Get workflow with steps
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: true },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'active') {
      LoggerService.logInfo('Workflow is not active, skipping webhook execution', { workflowId });
      return;
    }

    // Extract lead ID from webhook payload
    const leadId = this.extractLeadId(payload);
    if (!leadId) {
      LoggerService.logInfo('No lead ID found in webhook payload, skipping execution');
      return;
    }

    // Verify lead exists and belongs to tenant
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
      },
    });

    if (!lead) {
      LoggerService.logInfo('Lead not found or does not belong to tenant', { leadId, tenantId });
      return;
    }

    // Execute workflow for the lead
    try {
      const executionId = await WorkflowEngine.executeWorkflow(
        workflowId,
        leadId,
        tenantId,
        {
          triggeredBy: 'webhook',
          triggerId,
          webhookEvent: eventType,
          webhookPayload: payload,
        }
      );

      LoggerService.logInfo('Webhook workflow execution completed', {
        workflowId,
        triggerId,
        leadId,
        executionId,
        eventType,
      });
    } catch (error) {
      LoggerService.logError('Failed to execute workflow for webhook', undefined, {
        workflowId,
        triggerId,
        leadId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   */
  private async validateSignature(
    payload: any,
    signature: string | undefined,
    secret: string
  ): Promise<void> {
    if (!signature) {
      throw new Error('Webhook signature is required but not provided');
    }

    // Create expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');

    // Use constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Extract lead ID from webhook payload
   * Supports common webhook formats
   */
  private extractLeadId(payload: any): string | null {
    // Handle different payload formats
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return null;
      }
    }

    // Common webhook payload structures
    const possiblePaths = [
      'lead.id',
      'lead_id',
      'id',
      'data.lead.id',
      'data.id',
      'object.id', // Stripe-like
      'resource.id', // Generic API
    ];

    for (const path of possiblePaths) {
      const value = this.getNestedValue(payload, path);
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate webhook URL for a trigger
   */
  static generateWebhookUrl(triggerId: string, baseUrl: string): string {
    return `${baseUrl}/api/v1/workflows/webhook/${triggerId}`;
  }

  /**
   * Generate webhook secret
   */
  static generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}