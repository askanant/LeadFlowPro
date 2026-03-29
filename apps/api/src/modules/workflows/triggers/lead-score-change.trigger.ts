import { ITriggerExecutor, TriggerExecutionContext, LeadScoreTriggerConfig } from '../types';
import { WorkflowEngine } from '../engine';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Triggers workflow when a lead's quality score changes.
 * Called when lead scoring is updated.
 */
export class LeadScoreChangeTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { leadId, oldScore, newScore } = metadata || {};

    if (!leadId) {
      LoggerService.logWarn('LeadScoreChangeTrigger: no leadId in metadata');
      return;
    }

    const { minScore, maxScore, direction } = config as LeadScoreTriggerConfig;

    // Check direction filter
    if (direction === 'up' && newScore <= oldScore) return;
    if (direction === 'down' && newScore >= oldScore) return;

    // Check threshold filters
    if (minScore !== undefined && newScore < minScore) return;
    if (maxScore !== undefined && newScore > maxScore) return;

    await WorkflowEngine.executeWorkflow(workflowId, leadId, tenantId, {
      triggerType: 'lead_score_change',
      triggerId,
      oldScore,
      newScore,
    });

    LoggerService.logInfo('LeadScoreChangeTrigger: executed', { workflowId, leadId, oldScore, newScore });
  }
}
