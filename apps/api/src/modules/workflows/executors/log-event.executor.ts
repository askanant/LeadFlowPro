import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { LoggerService } from '../../../shared/services/logger.service';


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

      LoggerService.logInfo('Logged workflow event', {
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
      LoggerService.logError('LogEventExecutor failed', undefined, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
