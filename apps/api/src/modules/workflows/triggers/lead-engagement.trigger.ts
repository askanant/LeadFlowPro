import { ITriggerExecutor, TriggerExecutionContext } from '../types';
import { WorkflowEngine } from '../engine';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Triggers workflow when a lead has engagement activity.
 * Called by various activity handlers (call, email open, form submission).
 */
export class LeadEngagementTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { leadId, engagementType } = metadata || {};

    if (!leadId) {
      LoggerService.logWarn('LeadEngagementTrigger: no leadId in metadata');
      return;
    }

    // Optional: filter by engagement type
    const { engagementTypes } = config;
    if (engagementTypes && Array.isArray(engagementTypes) && engagementTypes.length > 0) {
      if (!engagementTypes.includes(engagementType)) return;
    }

    await WorkflowEngine.executeWorkflow(workflowId, leadId, tenantId, {
      triggerType: 'lead_engagement',
      triggerId,
      engagementType,
    });

    LoggerService.logInfo('LeadEngagementTrigger: executed', { workflowId, leadId, engagementType });
  }
}
