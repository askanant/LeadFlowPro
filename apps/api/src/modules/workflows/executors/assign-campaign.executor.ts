import { IActionExecutor, ActionExecutionContext, StepExecutionResult } from '../types';
import { prisma } from '../../../shared/database/prisma';

export class AssignCampaignExecutor implements IActionExecutor {
  async execute(config: Record<string, any>, context: ActionExecutionContext): Promise<StepExecutionResult> {
    try {
      const { leadId, tenantId } = context;
      const { campaignId } = config;

      if (!campaignId) {
        return { success: false, error: 'campaignId is required' };
      }

      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, tenantId },
      });

      if (!campaign) {
        return { success: false, error: 'Campaign not found' };
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: { campaignId },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'lead:assigned_campaign',
          resource: 'lead',
          resourceId: leadId,
          metadata: {
            campaignId,
            campaignName: campaign.name,
            workflowId: context.workflowId,
          },
        },
      });

      console.log('AssignCampaignExecutor: assigned lead to campaign', {
        leadId,
        campaignId,
        campaignName: campaign.name,
      });

      return {
        success: true,
        data: { campaignId, campaignName: campaign.name },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('AssignCampaignExecutor failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }
}
