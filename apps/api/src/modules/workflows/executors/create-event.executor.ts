import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';

export class CreateEventExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId, tenantId } = context;
      const { eventType, eventData = {} } = config;

      if (!eventType) {
        return { success: false, error: 'eventType is required' };
      }

      const event = await prisma.auditLog.create({
        data: {
          tenantId,
          action: `event:${eventType}`,
          resource: 'lead',
          resourceId: leadId,
          metadata: {
            ...eventData,
            workflowId: context.workflowId,
            executionId: context.executionId,
            createdByWorkflow: true,
          },
        },
      });

      console.log('CreateEventExecutor: created event', {
        eventId: event.id,
        eventType,
        leadId,
      });

      return {
        success: true,
        data: { eventId: event.id, eventType },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('CreateEventExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
