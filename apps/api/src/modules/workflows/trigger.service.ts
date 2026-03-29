import { prisma } from '../../shared/database/prisma';
import { getTriggerExecutor, ScheduledTriggerExecutor } from './triggers';
import { WorkflowTriggerType, ScheduledTriggerConfig } from './types';
import cron from 'node-cron';
import * as parser from 'cron-parser';
import { LoggerService } from '../../shared/services/logger.service';
import { WebhookTriggerExecutor } from './triggers/webhook.trigger';

export class TriggerService {
  /**
   * Create a new workflow trigger
   */
  static async createTrigger(
    workflowId: string,
    tenantId: string,
    data: {
      type: WorkflowTriggerType;
      config?: Record<string, any>;
      webhookUrl?: string;
      webhookSecret?: string;
    }
  ) {
    // Validate trigger type
    if (!this.isValidTriggerType(data.type)) {
      throw new Error(`Invalid trigger type: ${data.type}`);
    }

    // Validate config based on trigger type
    if (data.type === 'scheduled') {
      if (!data.config?.cronExpression || !data.config?.timezone) {
        throw new Error('Scheduled trigger requires cronExpression and timezone');
      }

      if (!cron.validate(data.config.cronExpression)) {
        throw new Error(`Invalid cron expression: ${data.config.cronExpression}`);
      }
    }

    // Generate webhook credentials for webhook triggers
    let webhookUrl = data.webhookUrl;
    let webhookSecret = data.webhookSecret;

    if (data.type === 'webhook') {
      if (!webhookUrl || !webhookSecret) {
        // Generate credentials if not provided
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const credentials = this.generateWebhookCredentials('temp', baseUrl);
        webhookUrl = credentials.webhookUrl;
        webhookSecret = credentials.webhookSecret;
      }
    }

    // Create trigger
    const trigger = await prisma.workflowTrigger.create({
      data: {
        tenantId,
        workflowId,
        type: data.type,
        config: data.config,
        webhookUrl,
        webhookSecret,
        isActive: false, // Inactive by default until explicitly activated
      },
    });

    // Update webhook URL with actual trigger ID
    if (data.type === 'webhook' && !data.webhookUrl) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const actualWebhookUrl = WebhookTriggerExecutor.generateWebhookUrl(trigger.id, baseUrl);

      await prisma.workflowTrigger.update({
        where: { id: trigger.id },
        data: { webhookUrl: actualWebhookUrl },
      });

      trigger.webhookUrl = actualWebhookUrl;
    }

    // Create schedule if it's a scheduled trigger
    if (data.type === 'scheduled' && data.config?.cronExpression) {
      const timezone = data.config.timezone || 'UTC';

      // Calculate next run time using cron-parser
      const interval = parser.default.parse(data.config.cronExpression, { tz: timezone });
      const nextDate = interval.next();

      await prisma.workflowSchedule.create({
        data: {
          tenantId,
          triggerId: trigger.id,
          cronExpression: data.config.cronExpression,
          timezone,
          nextRunAt: nextDate.toDate(),
        },
      });
    }

    LoggerService.logInfo('Created workflow trigger', { workflowId, triggerId: trigger.id });
    return trigger;
  }

  /**
   * Get trigger by ID (for webhook endpoints - no tenant check)
   */
  static async getTrigger(triggerId: string, tenantId?: string): Promise<any> {
    const trigger = await prisma.workflowTrigger.findUnique({
      where: { id: triggerId },
      include: { schedule: true },
    });

    return trigger;
  }

  /**
   * List triggers for a workflow
   */
  static async listTriggers(workflowId: string, tenantId: string) {
    return prisma.workflowTrigger.findMany({
      where: { workflowId, tenantId },
      include: { schedule: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update trigger
   */
  static async updateTrigger(
    triggerId: string,
    tenantId: string,
    data: {
      type?: WorkflowTriggerType;
      config?: Record<string, any>;
      webhookUrl?: string;
      webhookSecret?: string;
      isActive?: boolean;
    }
  ) {
    const trigger = await this.getTrigger(triggerId, tenantId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    // If deactivating, stop the trigger executor
    if (data.isActive === false && trigger.isActive) {
      if (trigger.type === 'scheduled') {
        await ScheduledTriggerExecutor.stop(triggerId);
      }
    }

    const updated = await prisma.workflowTrigger.update({
      where: { id: triggerId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { schedule: true },
    });

    // If activating scheduled trigger, start the executor
    if (data.isActive === true && !trigger.isActive && updated.type === 'scheduled') {
      try {
        const executor = getTriggerExecutor('scheduled');
        if (executor) {
          await executor.execute((updated.config || {}) as Record<string, any>, {
            tenantId,
            workflowId: updated.workflowId,
            triggerId: updated.id,
          });
        }
      } catch (error) {
        // Log error but don't fail
        LoggerService.logError('Failed to activate scheduled trigger', undefined, {
          triggerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    LoggerService.logInfo('Updated workflow trigger', { triggerId });
    return updated;
  }

  /**
   * Delete trigger
   */
  static async deleteTrigger(triggerId: string, tenantId: string) {
    const trigger = await this.getTrigger(triggerId, tenantId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    // Stop the trigger executor if it's running
    if (trigger.isActive) {
      if (trigger.type === 'scheduled') {
        await ScheduledTriggerExecutor.stop(triggerId);
      }
    }

    const deleted = await prisma.workflowTrigger.delete({
      where: { id: triggerId },
    });

    LoggerService.logInfo('Deleted workflow trigger', { triggerId });
    return deleted;
  }

  /**
   * Activate trigger
   */
  static async activateTrigger(triggerId: string, tenantId: string) {
    return this.updateTrigger(triggerId, tenantId, { isActive: true });
  }

  /**
   * Deactivate trigger
   */
  static async deactivateTrigger(triggerId: string, tenantId: string) {
    return this.updateTrigger(triggerId, tenantId, { isActive: false });
  }

  /**
   * Validate trigger type
   */
  static isValidTriggerType(type: string): type is WorkflowTriggerType {
    const validTypes: WorkflowTriggerType[] = [
      'scheduled',
      'webhook',
      'lead_status_change',
      'lead_created',
      'call_completed',
      'lead_score_change',
      'lead_engagement',
      'time_since_event',
      'campaign_performance',
      'batch_execution',
      'manual',
    ];
    return validTypes.includes(type as WorkflowTriggerType);
  }

  /**
   * Validate trigger config on create/update
   */
  static validateTriggerConfig(type: WorkflowTriggerType, config?: Record<string, any>) {
    const errors: string[] = [];

    switch (type) {
      case 'scheduled':
        if (!config?.cronExpression || !config?.timezone) {
          errors.push('Scheduled trigger requires cronExpression and timezone');
        } else if (!cron.validate(config.cronExpression)) {
          errors.push('Invalid cron expression');
        }
        break;

      case 'webhook':
        if (!config?.events || !Array.isArray(config.events) || config.events.length === 0) {
          errors.push('Webhook trigger requires at least one event type in events array');
        }
        break;

      case 'time_since_event':
        if (!config?.days || typeof config.days !== 'number' || config.days <= 0) {
          errors.push('days must be a positive number');
        }
        if (!config?.eventType || !['created', 'last_contact', 'status_change'].includes(config.eventType)) {
          errors.push('eventType must be "created", "last_contact", or "status_change"');
        }
        break;

      case 'batch_execution':
        if (!config?.filters || typeof config.filters !== 'object') {
          errors.push('filters object is required');
        }
        break;

      default:
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate webhook URL and secret for a trigger
   */
  static generateWebhookCredentials(triggerId: string, baseUrl: string) {
    const webhookUrl = WebhookTriggerExecutor.generateWebhookUrl(triggerId, baseUrl);
    const webhookSecret = WebhookTriggerExecutor.generateWebhookSecret();

    return { webhookUrl, webhookSecret };
  }

  /**
   * Test a trigger (for debugging)
   */
  static async testTrigger(triggerId: string, tenantId: string) {
    const trigger = await this.getTrigger(triggerId, tenantId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }

    if (!trigger.isActive) {
      throw new Error('Trigger is not active');
    }

    const executor = getTriggerExecutor(trigger.type);
    if (!executor) {
      throw new Error(`No executor found for trigger type: ${trigger.type}`);
    }

    try {
      // Execute the trigger immediately
      await executor.execute(trigger.config || {}, {
        tenantId,
        workflowId: trigger.workflowId,
        triggerId: trigger.id,
        metadata: { testRun: true },
      });

      return { success: true, message: 'Trigger test executed successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get trigger schedule information
   */
  static async getTriggerSchedule(triggerId: string) {
    const schedule = await prisma.workflowSchedule.findUnique({
      where: { triggerId },
    });

    return schedule;
  }
}
