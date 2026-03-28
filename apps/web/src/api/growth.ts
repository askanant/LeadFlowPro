import { useQuery } from '@tanstack/react-query';
import { api } from './client';

// ─── Types ─────────────────────────────────────────────────────────────

export interface CampaignConversionData {
  id: string;
  name: string;
  platform: string;
  status: string;
  totalLeads: number;
  convertedLeads: number;
  qualifiedLeads: number;
  junkLeads: number;
  hotLeads: number;
  avgQuality: number;
  conversionRate: number;
  qualificationRate: number;
  junkRate: number;
  costPerLead: number;
  costPerQualifiedLead: number;
  clickToLeadRate: number;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
}

export interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  campaignId?: string;
  campaignName?: string;
  platform?: string;
}

export interface PlatformSpendData {
  platform: string;
  totalSpend: number;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  junkLeads: number;
  costPerLead: number;
  costPerQualifiedLead: number;
  junkRate: number;
  roi: number;
  wastedSpend: number;
  activeCampaigns: number;
}

export interface DailyTrend {
  date: string;
  count: number;
}

export interface PlatformBreakdown {
  platform: string;
  count: number;
  percentage: number;
}

export interface LeadFlowData {
  dailyTrend: DailyTrend[];
  totalLeads30d: number;
  avgDailyVolume: number;
  velocityChange: number;
  platformBreakdown: PlatformBreakdown[];
  unusedPlatforms: string[];
  peakDay: string;
  peakDayCount: number;
}

// ─── Campaign Optimizer ────────────────────────────────────────────────

export function useCampaignOptimizerData() {
  return useQuery({
    queryKey: ['growth', 'campaign-optimizer'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CampaignConversionData[] }>('/growth/campaign-optimizer');
      return data.data;
    },
  });
}

export function useCampaignRecommendations() {
  return useQuery({
    queryKey: ['growth', 'campaign-recommendations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<{
        type: string;
        priority: 'high' | 'medium' | 'low';
        campaignId: string;
        campaignName: string;
        platform: string;
        message: string;
        impact: string;
      }> }>('/growth/campaign-optimizer/recommendations');
      return data.data.map((r): Recommendation => ({
        type: r.type,
        priority: r.priority,
        title: `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} - ${r.campaignName}`,
        description: r.message,
        impact: r.impact,
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        platform: r.platform,
      }));
    },
  });
}

// ─── Spend Optimizer ───────────────────────────────────────────────────

export function useSpendAnalytics() {
  return useQuery({
    queryKey: ['growth', 'spend-optimizer'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { summary: unknown; platforms: PlatformSpendData[] } }>('/growth/spend-optimizer');
      return data.data.platforms;
    },
  });
}

export function useBudgetRecommendations() {
  return useQuery({
    queryKey: ['growth', 'budget-recommendations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<{
        action: string;
        platform: string;
        currentSpend: number;
        suggestedChange: number;
        reason: string;
      }> }>('/growth/spend-optimizer/recommendations');
      return data.data.map((r): Recommendation => {
        const priority: 'high' | 'medium' | 'low' =
          r.action === 'pause' ? 'high' :
          r.action === 'decrease' ? 'high' :
          r.action === 'increase' ? 'medium' : 'low';
        return {
          type: r.action,
          priority,
          title: `${r.action.charAt(0).toUpperCase() + r.action.slice(1)} ${r.platform} budget`,
          description: r.reason,
          impact: r.suggestedChange !== 0
            ? `${r.suggestedChange > 0 ? '+' : ''}$${Math.abs(r.suggestedChange).toLocaleString()}`
            : 'No change needed',
          platform: r.platform,
        };
      });
    },
  });
}

// ─── Lead Flow Booster ─────────────────────────────────────────────────

export function useLeadFlowAnalytics() {
  return useQuery({
    queryKey: ['growth', 'lead-flow'],
    queryFn: async () => {
      const { data } = await api.get<{ data: {
        summary: { totalLeads30d: number; leadsPerDay: number; velocityChange: number };
        trend: Array<{ date: string; total: number; qualified: number; hot: number }>;
        platformStats: Array<{ platform: string; totalLeads: number; avgQuality: number; hotLeadPercentage: number }>;
        unusedPlatforms: string[];
      } }>('/growth/lead-flow');
      const raw = data.data;
      const totalPlatformLeads = raw.platformStats.reduce((s, p) => s + p.totalLeads, 0);
      const peakEntry = raw.trend.reduce((best, d) => d.total > best.total ? d : best, { date: '', total: 0 });
      const result: LeadFlowData = {
        totalLeads30d: raw.summary.totalLeads30d,
        avgDailyVolume: raw.summary.leadsPerDay,
        velocityChange: raw.summary.velocityChange,
        dailyTrend: raw.trend.map(d => ({ date: d.date, count: d.total })),
        platformBreakdown: raw.platformStats.map(p => ({
          platform: p.platform,
          count: p.totalLeads,
          percentage: totalPlatformLeads > 0 ? Math.round((p.totalLeads / totalPlatformLeads) * 100) : 0,
        })),
        unusedPlatforms: raw.unusedPlatforms,
        peakDay: peakEntry.date,
        peakDayCount: peakEntry.total,
      };
      return result;
    },
  });
}

export function useGrowthRecommendations() {
  return useQuery({
    queryKey: ['growth', 'growth-recommendations'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<{
        type: string;
        priority: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        expectedImpact: string;
      }> }>('/growth/lead-flow/recommendations');
      return data.data.map((r): Recommendation => ({
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description,
        impact: r.expectedImpact,
      }));
    },
  });
}
