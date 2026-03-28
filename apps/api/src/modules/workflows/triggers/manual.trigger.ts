import { ITriggerExecutor, TriggerExecutionContext } from '../types';
import { WorkflowEngine } from '../engine';

/**
 * Manual triggers are invoked directly via API.
 * This executor simply runs the workflow for the given lead.
 */
export class ManualTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { leadId } = metadata || {};

    if (!leadId) {
      console.warn('ManualTrigger: no leadId in metadata');
      return;
    }

    await WorkflowEngine.executeWorkflow(workflowId, leadId, tenantId, {
      triggerType: 'manual',
      triggerId,
      ...(metadata?.testRun ? { testRun: true } : {}),
    });

    console.log('ManualTrigger: executed', { workflowId, leadId });
  }
}
