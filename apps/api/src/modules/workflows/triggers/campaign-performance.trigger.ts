import { ITriggerExecutor, TriggerExecutionContext } from '../types';
import { prisma } from '../../../shared/database/prisma';
import { WorkflowEngine } from '../engine';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Triggers workflow when campaign performance thresholds are met.
 * Typically run on a schedule to check campaign metrics.
 */
export class CampaignPerformanceTriggerExecutor implements ITriggerExecutor {
  async execute(config: Record<string, any>, context: TriggerExecutionContext): Promise<void> {
    const { tenantId, workflowId, triggerId, metadata } = context;
    const { campaignId, metricType, threshold, direction = 'above' } = config;

    // If called with specific lead, execute directly
    if (metadata?.leadId) {
      await WorkflowEngine.executeWorkflow(workflowId, metadata.leadId, tenantId, {
        triggerType: 'campaign_performance',
        triggerId,
      });
      return;
    }

    // Otherwise, evaluate campaign metrics
    const recentMetrics = await prisma.campaignMetric.findMany({
      where: {
        tenantId,
        ...(campaignId ? { campaignId } : {}),
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { campaign: true },
      orderBy: { date: 'desc' },
    });

    if (recentMetrics.length === 0) return;

    // Group by campaign and evaluate
    const byCampaign = new Map<string, typeof recentMetrics>();
    for (const m of recentMetrics) {
      const existing = byCampaign.get(m.campaignId) || [];
      existing.push(m);
      byCampaign.set(m.campaignId, existing);
    }

    for (const [cId, metrics] of byCampaign) {
      let value: number | null = null;

      switch (metricType) {
        case 'cpl':
          const cpls = metrics.map((m) => Number(m.cpl)).filter((v) => !isNaN(v));
          value = cpls.length ? cpls.reduce((a, b) => a + b, 0) / cpls.length : null;
          break;
        case 'spend':
          value = metrics.reduce((sum, m) => sum + Number(m.spend || 0), 0);
          break;
        case 'leads':
          value = metrics.reduce((sum, m) => sum + (m.leadsCount || 0), 0);
          break;
      }

      if (value === null) continue;

      const thresholdMet =
        direction === 'above' ? value >= threshold : value <= threshold;

      if (!thresholdMet) continue;

      // Find leads from this campaign to trigger on
      const leads = await prisma.lead.findMany({
        where: { tenantId, campaignId: cId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      for (const lead of leads) {
        try {
          await WorkflowEngine.executeWorkflow(workflowId, lead.id, tenantId, {
            triggerType: 'campaign_performance',
            triggerId,
            campaignId: cId,
            metricType,
            value,
            threshold,
          });
        } catch (error) {
          LoggerService.logError('CampaignPerformanceTrigger: failed for lead', undefined, {
            leadId: lead.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    LoggerService.logInfo('CampaignPerformanceTrigger: evaluated', { workflowId, triggerId });
  }
}
