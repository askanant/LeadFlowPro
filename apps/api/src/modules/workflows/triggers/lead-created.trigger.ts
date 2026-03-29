import { ITriggerExecutor, TriggerExecutionContext } from '../types';
import { WorkflowEngine } from '../engine';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Triggers workflow when a new lead is created.
 * Called by the lead creation API.
 */
export class LeadCreatedTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { leadId } = metadata || {};

    if (!leadId) {
      LoggerService.logWarn('LeadCreatedTrigger: no leadId in metadata');
      return;
    }

    // Optional: filter by source platform
    const { platform } = config;
    if (platform && metadata?.platform !== platform) return;

    await WorkflowEngine.executeWorkflow(workflowId, leadId, tenantId, {
      triggerType: 'lead_created',
      triggerId,
    });

    LoggerService.logInfo('LeadCreatedTrigger: executed', { workflowId, leadId });
  }
}
