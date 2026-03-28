import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';


export class LogEventExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { tenantId, leadId, workflowId, stepId } = context;
      const { eventType, message, metadata = {} } = config;

      if (!eventType) {
        return { success: false, error: 'eventType is required' };
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          tenantId,
          action: `workflow:${eventType}`,
          resource: 'workflow',
          resourceId: workflowId,
          metadata: {
            leadId,
            stepId,
            message,
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
      });

      console.log('Logged workflow event', {
        tenantId,
        leadId,
        eventType,
        message,
      });

      return {
        success: true,
        data: { eventType, message, logged: true },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('LogEventExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
