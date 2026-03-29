import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { LoggerService } from '../../../shared/services/logger.service';

export class AddNoteExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId } = context;
      const { content } = config;

      if (!content) {
        return { success: false, error: 'Note content is required' };
      }

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      // Interpolate variables
      const vars: Record<string, string> = {
        '{{firstName}}': lead.firstName || '',
        '{{lastName}}': lead.lastName || '',
        '{{status}}': lead.status,
        '{{qualityScore}}': String(lead.qualityScore ?? 'N/A'),
      };

      let finalContent = content;
      for (const [key, val] of Object.entries(vars)) {
        finalContent = finalContent.replaceAll(key, val);
      }

      const note = await prisma.leadNote.create({
        data: {
          leadId,
          content: finalContent,
          createdBy: `workflow:${context.workflowId}`,
        },
      });

      LoggerService.logInfo('AddNoteExecutor: added note', { noteId: note.id, leadId });

      return {
        success: true,
        data: { noteId: note.id },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      LoggerService.logError('AddNoteExecutor failed', undefined, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
