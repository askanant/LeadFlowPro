import { ITriggerExecutor, TriggerExecutionContext } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Triggers workflow when a lead's status changes.
 * Called by the lead update API when status is modified.
 */
export class LeadStatusChangeTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { leadId, oldStatus, newStatus } = metadata || {};

    if (!leadId) {
      LoggerService.logWarn('LeadStatusChangeTrigger: no leadId in metadata');
      return;
    }

    // Check if trigger config specifies particular status transitions
    const { fromStatus, toStatus } = config;

    if (fromStatus && oldStatus !== fromStatus) return;
    if (toStatus && newStatus !== toStatus) return;

    await WorkflowEngine.executeWorkflow(workflowId, leadId, tenantId, {
      triggerType: 'lead_status_change',
      triggerId,
      oldStatus,
      newStatus,
    });

    LoggerService.logInfo('LeadStatusChangeTrigger: executed', { workflowId, leadId, oldStatus, newStatus });
  }
}
