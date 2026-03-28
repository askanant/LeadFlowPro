import { prisma } from '../../shared/database/prisma';
import { getTenantFilter } from '../../shared/utils/tenant-filter';

export class GrowthService {
  // ─── Campaign Optimizer ──────────────────────────────────────────────

  async getCampaignConversionAnalytics(tenantId: string, role: string | undefined) {
    const filter = getTenantFilter(tenantId, role);

    const campaigns = await prisma.campaign.findMany({
      where: { ...filter, status: { in: ['active', 'paused'] } },
      include: {
        leads: {
          select: { id: true, status: true, qualityScore: true, receivedAt: true, platform: true },
        },
        campaignMetrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    return campaigns.map((c) => {
      const totalLeads = c.leads.length;
      const convertedLeads = c.leads.filter((l) => l.status === 'converted').length;
      const qualifiedLeads = c.leads.filter((l) => l.status === 'qualified').length;
      const junkLeads = c.leads.filter((l) => l.status === 'junk' || (l.qualityScore != null && l.qualityScore < 30)).length;
      const hotLeads = c.leads.filter((l) => l.qualityScore != null && l.qualityScore >= 80).length;
      const avgQuality = totalLeads > 0
        ? Math.round(c.leads.reduce((sum, l) => sum + (l.qualityScore ?? 0), 0) / totalLeads)
        : 0;

      const totalSpend = c.campaignMetrics.reduce((sum, m) => sum + Number(m.spend ?? 0), 0);
      const totalClicks = c.campaignMetrics.reduce((sum, m) => sum + (m.clicks ?? 0), 0);
      const totalImpressions = c.campaignMetrics.reduce((sum, m) => sum + (m.impressions ?? 0), 0);

      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
      const qualificationRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
      const junkRate = totalLeads > 0 ? Math.round((junkLeads / totalLeads) * 100) : 0;
      const costPerLead = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;
      const costPerQualifiedLead = qualifiedLeads > 0 ? Math.round((totalSpend / qualifiedLeads) * 100) / 100 : 0;
      const clickToLeadRate = totalClicks > 0 ? Math.round((totalLeads / totalClicks) * 10000) / 100 : 0;

      return {
        id: c.id,
        name: c.name,
        platform: c.platform,
        status: c.status,
        totalLeads,
        convertedLeads,
        qualifiedLeads,
        junkLeads,
        hotLeads,
        avgQuality,
        conversionRate,
        qualificationRate,
        junkRate,
        totalSpend,
        totalClicks,
        totalImpressions,
        costPerLead,
        costPerQualifiedLead,
        clickToLeadRate,
        dailyBudget: c.dailyBudget ? Number(c.dailyBudget) : null,
        totalBudget: c.totalBudget ? Number(c.totalBudget) : null,
      };
    });
  }

  async getCampaignRecommendations(tenantId: string, role: string | undefined) {
    const analytics = await this.getCampaignConversionAnalytics(tenantId, role);
    const recommendations: Array<{
      type: 'scale' | 'pause' | 'optimize' | 'reallocate';
      priority: 'high' | 'medium' | 'low';
      campaignId: string;
      campaignName: string;
      platform: string;
      message: string;
      impact: string;
    }> = [];

    for (const c of analytics) {
      // High junk rate — suggest pausing
      if (c.junkRate > 50 && c.totalLeads >= 5) {
        recommendations.push({
          type: 'pause',
          priority: 'high',
          campaignId: c.id,
          campaignName: c.name,
          platform: c.platform,
          message: `${c.junkRate}% of leads are junk. Consider pausing and refining targeting.`,
          impact: `Save $${Math.round(c.totalSpend * (c.junkRate / 100))} in wasted spend`,
        });
      }

      // High conversion — suggest scaling
      if (c.conversionRate > 20 && c.totalLeads >= 5) {
        recommendations.push({
          type: 'scale',
          priority: 'high',
          campaignId: c.id,
          campaignName: c.name,
          platform: c.platform,
          message: `${c.conversionRate}% conversion rate — a top performer. Increase budget to capture more leads.`,
          impact: `Potential +${Math.round(c.convertedLeads * 0.5)} more conversions`,
        });
      }

      // Low quality but getting leads — optimize targeting
      if (c.avgQuality < 40 && c.totalLeads >= 10 && c.junkRate < 50) {
        recommendations.push({
          type: 'optimize',
          priority: 'medium',
          campaignId: c.id,
          campaignName: c.name,
          platform: c.platform,
          message: `Average lead quality is ${c.avgQuality}/100. Tighten audience targeting or add lead form questions.`,
          impact: `Could improve quality score by 20-30 points`,
        });
      }

      // No conversions with spend — flag
      if (c.totalSpend > 100 && c.convertedLeads === 0 && c.totalLeads >= 3) {
        recommendations.push({
          type: 'reallocate',
          priority: 'high',
          campaignId: c.id,
          campaignName: c.name,
          platform: c.platform,
          message: `$${Math.round(c.totalSpend)} spent with 0 conversions. Reallocate budget to better-performing campaigns.`,
          impact: `Recover $${Math.round(c.totalSpend)} in wasted spend`,
        });
      }
    }

    return recommendations.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    });
  }

  // ─── Spend Optimizer ─────────────────────────────────────────────────

  async getSpendAnalytics(tenantId: string, role: string | undefined) {
    const filter = getTenantFilter(tenantId, role);

    const campaigns = await prisma.campaign.findMany({
      where: filter,
      include: {
        leads: {
          select: { id: true, status: true, qualityScore: true },
        },
        campaignMetrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    // Per-platform aggregation
    const platformMap = new Map<string, {
      totalSpend: number;
      totalLeads: number;
      qualifiedLeads: number;
      convertedLeads: number;
      junkLeads: number;
      campaigns: number;
      activeCampaigns: number;
    }>();

    for (const c of campaigns) {
      const spend = c.campaignMetrics.reduce((s, m) => s + Number(m.spend ?? 0), 0);
      const leads = c.leads.length;
      const qualified = c.leads.filter((l) => l.status === 'qualified' || l.status === 'converted').length;
      const converted = c.leads.filter((l) => l.status === 'converted').length;
      const junk = c.leads.filter((l) => l.status === 'junk' || (l.qualityScore != null && l.qualityScore < 30)).length;

      const existing = platformMap.get(c.platform) ?? {
        totalSpend: 0, totalLeads: 0, qualifiedLeads: 0, convertedLeads: 0, junkLeads: 0, campaigns: 0, activeCampaigns: 0,
      };

      platformMap.set(c.platform, {
        totalSpend: existing.totalSpend + spend,
        totalLeads: existing.totalLeads + leads,
        qualifiedLeads: existing.qualifiedLeads + qualified,
        convertedLeads: existing.convertedLeads + converted,
        junkLeads: existing.junkLeads + junk,
        campaigns: existing.campaigns + 1,
        activeCampaigns: existing.activeCampaigns + (c.status === 'active' ? 1 : 0),
      });
    }

    const platforms = Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      ...data,
      costPerLead: data.totalLeads > 0 ? Math.round((data.totalSpend / data.totalLeads) * 100) / 100 : 0,
      costPerQualifiedLead: data.qualifiedLeads > 0 ? Math.round((data.totalSpend / data.qualifiedLeads) * 100) / 100 : 0,
      junkRate: data.totalLeads > 0 ? Math.round((data.junkLeads / data.totalLeads) * 100) : 0,
      conversionRate: data.totalLeads > 0 ? Math.round((data.convertedLeads / data.totalLeads) * 100) : 0,
      wastedSpend: data.totalLeads > 0 ? Math.round(data.totalSpend * (data.junkLeads / data.totalLeads)) : 0,
      roi: data.totalSpend > 0 ? Math.round(((data.convertedLeads * 100 - data.totalSpend) / data.totalSpend) * 100) : 0,
    }));

    const totalSpend = platforms.reduce((s, p) => s + p.totalSpend, 0);
    const totalLeads = platforms.reduce((s, p) => s + p.totalLeads, 0);
    const totalQualified = platforms.reduce((s, p) => s + p.qualifiedLeads, 0);
    const totalWasted = platforms.reduce((s, p) => s + p.wastedSpend, 0);

    return {
      summary: {
        totalSpend,
        totalLeads,
        totalQualified,
        totalWasted,
        overallCPL: totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0,
        overallCPQL: totalQualified > 0 ? Math.round((totalSpend / totalQualified) * 100) / 100 : 0,
        wastePercentage: totalSpend > 0 ? Math.round((totalWasted / totalSpend) * 100) : 0,
      },
      platforms,
    };
  }

  async getBudgetRecommendations(tenantId: string, role: string | undefined) {
    const { platforms } = await this.getSpendAnalytics(tenantId, role);
    const recommendations: Array<{
      action: 'increase' | 'decrease' | 'pause' | 'maintain';
      platform: string;
      currentSpend: number;
      suggestedChange: number;
      reason: string;
    }> = [];

    // Sort by efficiency (cost per qualified lead, lower = better)
    const ranked = [...platforms]
      .filter((p) => p.totalLeads > 0)
      .sort((a, b) => a.costPerQualifiedLead - b.costPerQualifiedLead);

    for (const p of ranked) {
      if (p.junkRate > 60) {
        recommendations.push({
          action: 'decrease',
          platform: p.platform,
          currentSpend: p.totalSpend,
          suggestedChange: -Math.round(p.totalSpend * 0.5),
          reason: `${p.junkRate}% junk rate — cut budget 50% and reinvest in better platforms`,
        });
      } else if (p.conversionRate > 15 && p.costPerQualifiedLead < 50) {
        recommendations.push({
          action: 'increase',
          platform: p.platform,
          currentSpend: p.totalSpend,
          suggestedChange: Math.round(p.totalSpend * 0.3),
          reason: `Strong ${p.conversionRate}% conversion at $${p.costPerQualifiedLead}/qualified lead — scale up 30%`,
        });
      } else if (p.totalSpend > 200 && p.convertedLeads === 0) {
        recommendations.push({
          action: 'pause',
          platform: p.platform,
          currentSpend: p.totalSpend,
          suggestedChange: -p.totalSpend,
          reason: `$${Math.round(p.totalSpend)} spent with 0 conversions — pause and investigate`,
        });
      } else {
        recommendations.push({
          action: 'maintain',
          platform: p.platform,
          currentSpend: p.totalSpend,
          suggestedChange: 0,
          reason: `Performance is average — monitor and optimize targeting`,
        });
      }
    }

    return recommendations;
  }

  // ─── Lead Flow Booster ───────────────────────────────────────────────

  async getLeadFlowAnalytics(tenantId: string, role: string | undefined) {
    const filter = getTenantFilter(tenantId, role);

    // Lead volume by day for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leads = await prisma.lead.findMany({
      where: {
        ...filter,
        receivedAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        platform: true,
        qualityScore: true,
        status: true,
        receivedAt: true,
        campaignId: true,
      },
      orderBy: { receivedAt: 'asc' },
    });

    // Daily volume trend
    const dailyVolume = new Map<string, { total: number; qualified: number; hot: number }>();
    for (const lead of leads) {
      const day = lead.receivedAt.toISOString().slice(0, 10);
      const entry = dailyVolume.get(day) ?? { total: 0, qualified: 0, hot: 0 };
      entry.total++;
      if (lead.status === 'qualified' || lead.status === 'converted') entry.qualified++;
      if (lead.qualityScore != null && lead.qualityScore >= 80) entry.hot++;
      dailyVolume.set(day, entry);
    }

    const trend = Array.from(dailyVolume.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Platform breakdown
    const platformBreakdown = new Map<string, { total: number; avgQuality: number; qualities: number[] }>();
    for (const lead of leads) {
      const platform = lead.platform ?? 'unknown';
      const entry = platformBreakdown.get(platform) ?? { total: 0, avgQuality: 0, qualities: [] };
      entry.total++;
      if (lead.qualityScore != null) entry.qualities.push(lead.qualityScore);
      platformBreakdown.set(platform, entry);
    }

    const platformStats = Array.from(platformBreakdown.entries()).map(([platform, data]) => ({
      platform,
      totalLeads: data.total,
      avgQuality: data.qualities.length > 0
        ? Math.round(data.qualities.reduce((s, q) => s + q, 0) / data.qualities.length)
        : 0,
      hotLeadPercentage: data.qualities.length > 0
        ? Math.round((data.qualities.filter((q) => q >= 80).length / data.qualities.length) * 100)
        : 0,
    }));

    // Current velocity (leads per day, last 7 days vs prev 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentLeads = leads.filter((l) => l.receivedAt >= sevenDaysAgo).length;
    const previousLeads = leads.filter((l) => l.receivedAt >= fourteenDaysAgo && l.receivedAt < sevenDaysAgo).length;
    const velocityChange = previousLeads > 0
      ? Math.round(((recentLeads - previousLeads) / previousLeads) * 100)
      : recentLeads > 0 ? 100 : 0;

    // Active campaigns count
    const activeCampaigns = await prisma.campaign.count({
      where: { ...filter, status: 'active' },
    });

    // Unused platforms
    const usedPlatforms = new Set(platformStats.map((p) => p.platform));
    const allPlatforms = ['meta', 'google', 'linkedin', 'microsoft', 'taboola'];
    const unusedPlatforms = allPlatforms.filter((p) => !usedPlatforms.has(p));

    return {
      summary: {
        totalLeads30d: leads.length,
        leadsPerDay: Math.round(leads.length / 30),
        recentWeekLeads: recentLeads,
        velocityChange,
        activeCampaigns,
      },
      trend,
      platformStats,
      unusedPlatforms,
    };
  }

  async getGrowthRecommendations(tenantId: string, role: string | undefined) {
    const analytics = await this.getLeadFlowAnalytics(tenantId, role);
    const spend = await this.getSpendAnalytics(tenantId, role);
    const recommendations: Array<{
      type: 'new_platform' | 'scale_campaign' | 'new_campaign' | 'reactivate';
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      expectedImpact: string;
    }> = [];

    // Suggest unused platforms
    for (const platform of analytics.unusedPlatforms) {
      const names: Record<string, string> = {
        meta: 'Meta (Facebook/Instagram)',
        google: 'Google Ads',
        linkedin: 'LinkedIn Ads',
        microsoft: 'Microsoft Ads (Bing)',
        taboola: 'Taboola',
      };
      recommendations.push({
        type: 'new_platform',
        priority: 'medium',
        title: `Expand to ${names[platform] || platform}`,
        description: `You're not running campaigns on ${names[platform] || platform}. This platform could unlock a new audience segment.`,
        expectedImpact: '+15-30% lead volume potential',
      });
    }

    // Suggest scaling best platform
    const bestPlatform = analytics.platformStats
      .filter((p) => p.avgQuality > 60)
      .sort((a, b) => b.avgQuality - a.avgQuality)[0];

    if (bestPlatform) {
      recommendations.push({
        type: 'scale_campaign',
        priority: 'high',
        title: `Scale ${bestPlatform.platform} — your best source`,
        description: `${bestPlatform.platform} has ${bestPlatform.avgQuality}/100 avg quality with ${bestPlatform.hotLeadPercentage}% hot leads. Increasing budget here will yield highest ROI.`,
        expectedImpact: `+${Math.round(bestPlatform.totalLeads * 0.3)} qualified leads/month`,
      });
    }

    // Declining velocity warning
    if (analytics.summary.velocityChange < -20) {
      recommendations.push({
        type: 'new_campaign',
        priority: 'high',
        title: 'Lead velocity is declining',
        description: `Lead flow dropped ${Math.abs(analytics.summary.velocityChange)}% this week vs last. Launch new campaigns or refresh creatives to recover volume.`,
        expectedImpact: 'Prevent further lead decline',
      });
    }

    // Few active campaigns
    if (analytics.summary.activeCampaigns < 2) {
      recommendations.push({
        type: 'new_campaign',
        priority: 'high',
        title: 'Diversify with more campaigns',
        description: `You only have ${analytics.summary.activeCampaigns} active campaign(s). Running 3-5 campaigns across platforms reduces risk and increases volume.`,
        expectedImpact: '+50-100% total lead volume',
      });
    }

    // High quality unused platform from spend data
    const efficientPlatforms = spend.platforms
      .filter((p) => p.conversionRate > 10 && p.activeCampaigns < 2);
    for (const p of efficientPlatforms) {
      recommendations.push({
        type: 'scale_campaign',
        priority: 'medium',
        title: `Launch more ${p.platform} campaigns`,
        description: `${p.platform} has ${p.conversionRate}% conversion rate but only ${p.activeCampaigns} active campaign(s). Add campaigns to capture more of this high-performing channel.`,
        expectedImpact: `+${Math.round(p.totalLeads * 0.5)} leads at ${p.costPerQualifiedLead} CPQL`,
      });
    }

    return recommendations.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    });
  }
}

export const growthService = new GrowthService();
