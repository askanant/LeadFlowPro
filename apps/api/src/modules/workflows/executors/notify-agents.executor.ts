import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';


export class NotifyAgentsExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { tenantId, leadId } = context;

      // Get lead details
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { success: false, error: 'Lead not found' };
      }

      // Get active agents
      const agents = await prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          role: { in: ['company_admin', 'viewer'] },
        },
      });

      if (agents.length === 0) {
        console.warn('No active agents found to notify', { tenantId });
        return { success: true, data: { notifiedCount: 0 } };
      }

      // In production, send notifications via email/Slack/WhatsApp
      // For now, just log and return success
      const message = `New lead: ${lead.firstName} ${lead.lastName} (${lead.email})`;
      console.log('Notifying agents of new lead', { tenantId, leadId, agentCount: agents.length });

      return {
        success: true,
        data: {
          message,
          notifiedCount: agents.length,
          agentIds: agents.map((a) => a.id),
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('NotifyAgentsExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
