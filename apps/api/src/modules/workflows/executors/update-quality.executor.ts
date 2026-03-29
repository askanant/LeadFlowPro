import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { LoggerService } from '../../../shared/services/logger.service';


export class UpdateQualityExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId } = context;
      const { scoreAdjustment, setScore } = config;

      if (!scoreAdjustment && setScore === undefined) {
        return { success: false, error: 'Either scoreAdjustment or setScore must be provided' };
      }

      // Get current lead
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      let newScore = lead.qualityScore || 0;
      if (scoreAdjustment !== undefined) {
        newScore = Math.max(0, Math.min(100, newScore + scoreAdjustment));
      } else if (setScore !== undefined) {
        newScore = Math.max(0, Math.min(100, setScore));
      }

      // Update lead
      const updated = await prisma.lead.update({
        where: { id: leadId },
        data: { qualityScore: newScore },
      });

      LoggerService.logInfo('Updated lead quality score', {
        leadId,
        oldScore: lead.qualityScore,
        newScore,
      });

      return {
        success: true,
        data: { oldScore: lead.qualityScore, newScore },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      LoggerService.logError('UpdateQualityExecutor failed', undefined, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
