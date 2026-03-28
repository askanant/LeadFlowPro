import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useMutationWithErrorHandling } from '../hooks/useMutationWithErrorHandling';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DetailedLeadScore {
  overallScore: number;
  qualityScore: number;
  engagementScore: number;
  intentScore: number;
  firmographicScore: number;
  riskScore: number;
  tier: 'hot' | 'warm' | 'cold' | 'junk';
  signals: string[];
  recommendations: Array<{
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface ConversionPrediction {
  probability: number;
  confidence: number;
  estimatedDaysToConvert: number | null;
  suggestedFollowUpChannel: 'email' | 'phone' | 'sms' | 'linkedin';
  factors: {
    positive: string[];
    negative: string[];
  };
}

export interface ICPMatch {
  matchScore: number;
  matchedSegments: string[];
  icpFit: {
    [key: string]: {
      score: number;
      reason: string;
    };
  };
}

export interface LeadScoringReport {
  totalLeads: number;
  scoreDistribution: {
    hot: number;
    warm: number;
    cold: number;
    junk: number;
  };
  averageScores: {
    overall: number;
    quality: number;
    engagement: number;
    intent: number;
    firmographic: number;
    risk: number;
  };
  topFactors: Array<{
    factor: string;
    count: number;
    percentage: number;
  }>;
  conversionByTier: {
    hot: number;
    warm: number;
    cold: number;
    junk: number;
  };
  leadsByFactor: Array<{
    factor: string;
    totalLeads: number;
    tiers: {
      hot: number;
      warm: number;
      cold: number;
      junk: number;
    };
  }>;
  timelineData: Array<{
    date: string;
    count: number;
    avgScore: number;
  }>;
}

export interface LeadEnrichment {
  companyName?: string;
  companySize?: string;
  annualRevenue?: string;
  industry?: string;
  jobLevel?: 'C-level' | 'Director' | 'Manager' | 'IC' | 'Other';
  linkedInProfileUrl?: string;
  companyLinkedInUrl?: string;
  verifiedEmail?: boolean;
  phoneValid?: boolean;
}

// ============================================================================
// API Hooks
// ============================================================================

/**
 * Get detailed lead scoring breakdown
 * Shows engagement, intent, firmographic, and risk scores
 */
export function useLeadScoringBreakdown(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'scoring'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DetailedLeadScore }>(`/ai/leads/${leadId}/scoring-breakdown`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

/**
 * Predict conversion probability for a lead
 */
export function useConversionPrediction(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'conversion-prediction'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ConversionPrediction }>(`/ai/leads/${leadId}/conversion-prediction`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

/**
 * Check ICP match score for a lead
 */
export function useICPMatch(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'icp-match'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ICPMatch }>(`/ai/leads/${leadId}/match-to-icp`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

/**
 * Get all lead AI insights in one call (parallel queries)
 */
export function useLeadEnrichment(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'enrichment'],
    queryFn: async () => {
      const { data } = await api.get<{ data: LeadEnrichment }>(`/ai/leads/${leadId}/enrichment`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

export function useLeadAIInsights(leadId: string) {
  const scoring = useLeadScoringBreakdown(leadId);
  const prediction = useConversionPrediction(leadId);
  const icpMatch = useICPMatch(leadId);
  const enrichment = useLeadEnrichment(leadId);

  return {
    scoring,
    prediction,
    icpMatch,
    enrichment,
    isLoading:
      scoring.isLoading ||
      prediction.isLoading ||
      icpMatch.isLoading ||
      enrichment.isLoading,
    isError:
      scoring.isError ||
      prediction.isError ||
      icpMatch.isError ||
      enrichment.isError,
  };
}

/**
 * Check if lead works for a known competitor
 */
export function useCompetitorRisk(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'competitor-risk'],
    queryFn: async () => {
      const { data } = await api.get(`/ai/leads/${leadId}/competitor-risk`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

/**
 * Bulk score leads for a campaign
 */
export function useBulkScoreCampaign(campaignId?: string) {
  const queryClient = useQueryClient();
  return useMutationWithErrorHandling({
    mutationFn: async (cId?: string) => {
      const { data } = await api.post('/ai/bulk-score', { campaignId: cId || campaignId });
      return data.data;
    },
    successMessage: 'Bulk scoring completed',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'reports', 'lead-scoring'] });
    },
  });
}

/**
 * Get aggregated lead scoring statistics for analytics dashboard
 */
export function useLeadScoringReport() {
  return useQuery({
    queryKey: ['ai', 'reports', 'lead-scoring'],
    queryFn: async () => {
      const { data } = await api.get<{ data: LeadScoringReport }>(`/ai/reports/lead-scoring`);
      return data.data;
    },
  });
}

// Marker export to test module freshness
export const _AI_MODULE_FRESH = true;

// ============================================================================
// Advanced AI — Sprint 23
// ============================================================================

export interface ChurnRiskResult {
  leadId: string;
  churnRisk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: { factor: string; impact: number; detail: string }[];
  recommendation: string;
  lastActivityAt: string | null;
  daysSinceLastActivity: number | null;
}

export interface RoutingRecommendation {
  leadId: string;
  recommendedAgentId: string;
  recommendedAgentName: string;
  reason: string;
  confidence: number;
  alternatives: { agentId: string; agentName: string; score: number; reason: string }[];
}

export interface BestContactTime {
  leadId: string;
  bestTimes: { day: string; hour: number; label: string; confidence: number }[];
  timezone: string;
  reasoning: string;
}

export function useChurnRisk(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'churn-risk'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChurnRiskResult }>(`/ai/leads/${leadId}/churn-risk`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

export function useRoutingRecommendation(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'routing'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RoutingRecommendation }>(`/ai/leads/${leadId}/routing-recommendation`);
      return data.data;
    },
    enabled: !!leadId,
  });
}

export function useBestContactTime(leadId: string) {
  return useQuery({
    queryKey: ['ai', 'leads', leadId, 'best-contact-time'],
    queryFn: async () => {
      const { data } = await api.get<{ data: BestContactTime }>(`/ai/leads/${leadId}/best-contact-time`);
      return data.data;
    },
    enabled: !!leadId,
  });
}
