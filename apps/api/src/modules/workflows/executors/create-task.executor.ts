import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { LoggerService } from '../../../shared/services/logger.service';

export class CreateTaskExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId, tenantId } = context;
      const { title, description, assigneeId, dueInDays = 1, priority = 'medium' } = config;

      if (!title) {
        return { success: false, error: 'Task title is required' };
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      // Interpolate variables in title/description
      const vars: Record<string, string> = {
        '{{firstName}}': lead.firstName || '',
        '{{lastName}}': lead.lastName || '',
        '{{status}}': lead.status,
      };

      let finalTitle = title;
      let finalDescription = description || '';
      for (const [key, val] of Object.entries(vars)) {
        finalTitle = finalTitle.replaceAll(key, val);
        finalDescription = finalDescription.replaceAll(key, val);
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (typeof dueInDays === 'number' ? dueInDays : 1));

      // Create a real Task record
      const task = await prisma.task.create({
        data: {
          tenantId,
          title: finalTitle,
          description: finalDescription || null,
          priority,
          dueDate,
          assigneeId: assigneeId || null,
          leadId,
          workflowExecutionId: context.executionId || null,
          createdBy: null, // workflow-created
        },
      });

      // Also log an activity entry for the lead timeline
      await prisma.activity.create({
        data: {
          tenantId,
          leadId,
          type: 'task_created',
          summary: `Task created: ${finalTitle}`,
          metadata: { taskId: task.id, priority, dueDate: dueDate.toISOString() },
        },
      });

      LoggerService.logInfo('CreateTaskExecutor: created task', {
        taskId: task.id,
        title: finalTitle,
        leadId,
      });

      return {
        success: true,
        data: {
          taskId: task.id,
          title: finalTitle,
          dueDate: dueDate.toISOString(),
          priority,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      LoggerService.logError('CreateTaskExecutor failed', undefined, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
