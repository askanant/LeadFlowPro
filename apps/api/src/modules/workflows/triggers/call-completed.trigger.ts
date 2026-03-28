import { ITriggerExecutor, TriggerExecutionContext } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';

/**
 * Triggers workflow when a call is completed.
 * Called by the telephony webhook handler.
 */
export class CallCompletedTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { leadId, callLogId, durationSeconds, status } = metadata || {};

    if (!leadId) {
      console.warn('CallCompletedTrigger: no leadId in metadata');
      return;
    }

    // Optional: filter by minimum call duration
    const { minDuration, callStatus } = config;
    if (minDuration && durationSeconds < minDuration) return;
    if (callStatus && status !== callStatus) return;

    await WorkflowEngine.executeWorkflow(workflowId, leadId, tenantId, {
      triggerType: 'call_completed',
      triggerId,
      callLogId,
      durationSeconds,
    });

    console.log('CallCompletedTrigger: executed', { workflowId, leadId, callLogId });
  }
}
