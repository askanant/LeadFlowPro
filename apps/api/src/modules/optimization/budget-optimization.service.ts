import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';

export interface BudgetAdjustmentResult {
  campaignId: string;
  previousBudget: number;
  newBudget: number;
  reason: string;
  confidence: number; // 0-100
}

export class BudgetOptimizationService {
  /**
   * Auto-adjust campaign budget based on CPL performance vs target
   * - If CPL is high (above target): decrease budget or increase lead quality targeting
   * - If CPL is low (below target): increase budget to scale
   * - If CPL is optimal: maintain budget
   */
  async optimizeCampaignBudget(
    campaignId: string,
    tenantId: string
  ): Promise<BudgetAdjustmentResult> {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) throw new NotFoundError('Campaign');

    // Get last 7 days of metrics
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [metrics, leads] = await Promise.all([
      prisma.campaignMetric.findMany({
        where: { campaignId, createdAt: { gte: since } },
        orderBy: { date: 'desc' },
      }),
      prisma.lead.findMany({
        where: { campaignId, tenantId, createdAt: { gte: since } },
        select: { qualityScore: true, createdAt: true },
      }),
    ]);

    if (metrics.length === 0) {
      return {
        campaignId,
        previousBudget: Number(campaign.dailyBudget ?? 0),
        newBudget: Number(campaign.dailyBudget ?? 0),
        reason: 'Insufficient data (< 7 days)',
        confidence: 0,
      };
    }

    // Calculate 7-day performance
    const totalSpend = metrics.reduce((s, m) => s + Number(m.spend ?? 0), 0);
    const totalLeads = metrics.reduce((s, m) => s + (m.leadsCount ?? 0), 0);
    const avgQuality = leads.length > 0
      ? leads.reduce((s, l) => s + (l.qualityScore ?? 0), 0) / leads.length
      : 0;

    const currentCpl = totalLeads > 0 ? totalSpend / totalLeads : Infinity;
    const targetCpl = 50; // Default target CPL in dollars
    const minQuality = 60; // Minimum acceptable lead quality score

    let adjustmentFactor = 1.0;
    let reason = '';
    let confidence = 50;

    // CPL Analysis
    if (currentCpl > targetCpl * 1.5) {
      // CPL is 50%+ above target — aggressive decrease
      adjustmentFactor = 0.7;
      reason = `CPL $${currentCpl.toFixed(2)} is 50% above target $${targetCpl}. Decreasing budget to focus on optimization.`;
      confidence = 85;
    } else if (currentCpl > targetCpl * 1.2) {
      // CPL is 20% above target — moderate decrease
      adjustmentFactor = 0.85;
      reason = `CPL $${currentCpl.toFixed(2)} is 20% above target. Reducing budget.`;
      confidence = 75;
    } else if (currentCpl < targetCpl * 0.8) {
      // CPL is 20% below target — increase to scale
      adjustmentFactor = 1.3;
      reason = `CPL $${currentCpl.toFixed(2)} is 20% below target. Increasing budget to scale.`;
      confidence = 80;
    } else if (currentCpl < targetCpl * 0.95) {
      // CPL is near optimal — mild increase
      adjustmentFactor = 1.1;
      reason = `CPL $${currentCpl.toFixed(2)} is near target. Modest budget increase.`;
      confidence = 70;
    } else {
      reason = `CPL $${currentCpl.toFixed(2)} is optimal. Maintaining current budget.`;
      adjustmentFactor = 1.0;
      confidence = 60;
    }

    // Quality adjustment
    if (avgQuality < minQuality) {
      adjustmentFactor *= 0.9; // Further reduce budget if quality is low
      reason += ` Lead quality ${avgQuality.toFixed(0)} is below minimum ${minQuality}.`;
      confidence -= 10;
    } else if (avgQuality > 75) {
      adjustmentFactor *= 1.05; // Slight boost if quality is high
      confidence += 5;
    }

    // Calculate new budget
    const previousBudget = Number(campaign.dailyBudget ?? 0);
    let newBudget = previousBudget * adjustmentFactor;

    // Bounds: keep within 50-200 of current budget
    const minBudget = previousBudget * 0.5;
    const maxBudget = previousBudget * 2.0;
    newBudget = Math.max(minBudget, Math.min(maxBudget, newBudget));

    // Round to nearest dollar
    newBudget = Math.round(newBudget);

    // Update campaign if adjustment is significant (> $5 or >10%)
    const budgetDiff = Math.abs(newBudget - previousBudget);
    const percentDiff = (budgetDiff / previousBudget) * 100;

    if (budgetDiff > 5 && percentDiff > 10) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { dailyBudget: newBudget },
      });
    } else {
      newBudget = previousBudget; // No change if adjustment is too small
    }

    return {
      campaignId,
      previousBudget,
      newBudget,
      reason,
      confidence: Math.min(100, Math.max(0, confidence)),
    };
  }

  /**
   * Optimize all active campaigns for a tenant
   */
  async optimizeAllCampaigns(
    tenantId: string
  ): Promise<BudgetAdjustmentResult[]> {
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true },
    });

    const results = await Promise.all(
      campaigns.map((c) => this.optimizeCampaignBudget(c.id, tenantId))
    );

    return results;
  }

  /**
   * Get optimization recommendations (non-destructive analysis)
   */
  async getOptimizationRecommendations(
    campaignId: string,
    tenantId: string
  ): Promise<BudgetAdjustmentResult> {
    return this.optimizeCampaignBudget(campaignId, tenantId);
  }
}

export const budgetOptimizationService = new BudgetOptimizationService();
