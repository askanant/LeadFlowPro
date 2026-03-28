import { ActionType, IActionExecutor } from '../types';
import { NotifyAgentsExecutor } from './notify-agents.executor';
import { UpdateQualityExecutor } from './update-quality.executor';
import { AssignAgentExecutor } from './assign-agent.executor';
import { LogEventExecutor } from './log-event.executor';
import { UpdateMetricsExecutor } from './update-metrics.executor';
import { ConditionCheckExecutor } from './condition-check.executor';
import { SendEmailExecutor } from './send-email.executor';
import { SendSmsExecutor } from './send-sms.executor';
import { SendWebhookExecutor } from './send-webhook.executor';
import { UpdateLeadExecutor } from './update-lead.executor';
import { AssignCampaignExecutor } from './assign-campaign.executor';
import { CreateTaskExecutor } from './create-task.executor';
import { AddNoteExecutor } from './add-note.executor';
import { CreateEventExecutor } from './create-event.executor';

const executorMap: Record<ActionType, IActionExecutor> = {
  'notify-agents': new NotifyAgentsExecutor(),
  'update-quality': new UpdateQualityExecutor(),
  'assign-agent': new AssignAgentExecutor(),
  'log-event': new LogEventExecutor(),
  'update-metrics': new UpdateMetricsExecutor(),
  'condition-check': new ConditionCheckExecutor(),
  'send-email': new SendEmailExecutor(),
  'send-sms': new SendSmsExecutor(),
  'send-webhook': new SendWebhookExecutor(),
  'update-lead': new UpdateLeadExecutor(),
  'assign-campaign': new AssignCampaignExecutor(),
  'create-task': new CreateTaskExecutor(),
  'add-note': new AddNoteExecutor(),
  'create-event': new CreateEventExecutor(),
};

export function getActionExecutor(actionType: ActionType): IActionExecutor | undefined {
  return executorMap[actionType];
}
