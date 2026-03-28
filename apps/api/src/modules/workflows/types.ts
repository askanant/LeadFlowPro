// Workflow trigger types (database)
export type WorkflowTriggerType =
  | 'scheduled'           // Cron-based execution
  | 'webhook'             // Trigger via webhook
  | 'lead_status_change'  // When lead status changes
  | 'lead_created'        // When lead is created
  | 'call_completed'      // When call completes
  | 'lead_score_change'   // When lead quality score changes
  | 'lead_engagement'     // When lead has activity
  | 'time_since_event'    // X days since last event
  | 'campaign_performance' // Campaign metrics threshold
  | 'batch_execution'     // Bulk execution on lead list
  | 'manual';             // Manual trigger

// Workflow trigger configs
export interface ScheduledTriggerConfig {
  cronExpression: string;  // '0 9 * * MON' = 9am Monday
  timezone: string;        // 'America/New_York'
}

export interface WebhookTriggerConfig {
  webhookUrl: string;
  webhookSecret: string;
  events: string[];  // ['lead.created', 'lead.updated']
}

export interface LeadScoreTriggerConfig {
  minScore?: number;
  maxScore?: number;
  direction?: 'up' | 'down'; // up = score increased, down = score decreased
}

export interface TimeSinceTriggerConfig {
  days: number;
  eventType: 'created' | 'last_contact' | 'status_change';
}

export interface BatchTriggerConfig {
  filters: {
    status?: string[];
    platform?: string[];
    minScore?: number;
    maxScore?: number;
    createdAfter?: string;  // ISO date
  };
}

// Workflow action executor types
export type ActionType = 'notify-agents' | 'update-quality' | 'assign-agent' | 'log-event' | 'update-metrics' | 'condition-check' | 'send-email' | 'send-sms' | 'send-webhook' | 'update-lead' | 'assign-campaign' | 'create-task' | 'add-note' | 'create-event';

export interface WorkflowActionConfig {
  type: ActionType;
  config: Record<string, any>;
}

// Workflow step interface
export interface WorkflowStep {
  id: string;
  workflowId: string;
  order: number;
  actionType: ActionType;
  config?: Record<string, any>;
  isEnabled: boolean;
  nextStepOnSuccess?: string;  // ID of next step if action succeeds
  nextStepOnFailure?: string;  // ID of next step if action fails
  conditions?: Record<string, any>; // Complex condition rules for step execution
  createdAt: string;
  updatedAt?: string;
}

// Condition rule types
export interface ConditionRule {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'starts_with';
  value: any;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  rules: (ConditionRule | ConditionGroup)[];
}

// Workflow step execution result
export interface StepExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Action executor interface
export interface IActionExecutor {
  execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult>;
}

// Execution context passed to actions
export interface ActionExecutionContext {
  tenantId: string;
  leadId: string;
  executionId: string;
  stepId: string;
  workflowId: string;
  metadata?: Record<string, any>;
}

// Workflow execution status
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// Condition evaluator
export interface ConditionEvaluator {
  evaluate(lead: any, conditions: Record<string, any>): boolean;
}

// Trigger executor interface
export interface ITriggerExecutor {
  execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void>;
}

export interface TriggerExecutionContext {
  tenantId: string;
  workflowId: string;
  triggerId: string;
  metadata?: Record<string, any>;
}
