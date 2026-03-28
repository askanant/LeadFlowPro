import { WorkflowTriggerType, ITriggerExecutor, TriggerExecutionContext } from '../types';
import { ScheduledTriggerExecutor } from './scheduled.trigger';
import { WebhookTriggerExecutor } from './webhook.trigger';
import { LeadStatusChangeTriggerExecutor } from './lead-status-change.trigger';
import { LeadCreatedTriggerExecutor } from './lead-created.trigger';
import { CallCompletedTriggerExecutor } from './call-completed.trigger';
import { LeadScoreChangeTriggerExecutor } from './lead-score-change.trigger';
import { LeadEngagementTriggerExecutor } from './lead-engagement.trigger';
import { TimeSinceEventTriggerExecutor } from './time-since-event.trigger';
import { CampaignPerformanceTriggerExecutor } from './campaign-performance.trigger';
import { BatchExecutionTriggerExecutor } from './batch-execution.trigger';
import { ManualTriggerExecutor } from './manual.trigger';

const triggerRegistry: Record<WorkflowTriggerType, ITriggerExecutor> = {
  scheduled: new ScheduledTriggerExecutor(),
  webhook: new WebhookTriggerExecutor(),
  lead_status_change: new LeadStatusChangeTriggerExecutor(),
  lead_created: new LeadCreatedTriggerExecutor(),
  call_completed: new CallCompletedTriggerExecutor(),
  lead_score_change: new LeadScoreChangeTriggerExecutor(),
  lead_engagement: new LeadEngagementTriggerExecutor(),
  time_since_event: new TimeSinceEventTriggerExecutor(),
  campaign_performance: new CampaignPerformanceTriggerExecutor(),
  batch_execution: new BatchExecutionTriggerExecutor(),
  manual: new ManualTriggerExecutor(),
};

/**
 * Get trigger executor by type
 */
export function getTriggerExecutor(triggerType: WorkflowTriggerType): ITriggerExecutor | null {
  return triggerRegistry[triggerType] || null;
}

/**
 * Register trigger executor
 */
export function registerTriggerExecutor(
  triggerType: WorkflowTriggerType,
  executor: ITriggerExecutor
): void {
  triggerRegistry[triggerType] = executor;
}

/**
 * Initialize all trigger executors on startup
 */
export async function initializeTriggers(): Promise<void> {
  // Initialize scheduled triggers
  await ScheduledTriggerExecutor.initializeSchedules();
}

/**
 * Shutdown all trigger executors on graceful shutdown
 */
export async function shutdownTriggers(): Promise<void> {
  // Stop all scheduled triggers
  await ScheduledTriggerExecutor.stopAll();
}

export { ScheduledTriggerExecutor };
