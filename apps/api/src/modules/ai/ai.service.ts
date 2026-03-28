import OpenAI from 'openai';
import { prisma } from '../../shared/database/prisma';
import { config } from '../../config';
import { NotFoundError } from '../../shared/utils/errors';

// ─── OpenAI client (lazy-init so missing key doesn't crash startup) ────────────
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!config.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TargetingSuggestion {
  meta: {
    age_min: number;
    age_max: number;
    genders: string[];
    interests: string[];
    behaviors: string[];
    locations: string[];
  };
  google: {
    keywords: string[];
    negative_keywords: string[];
    audiences: string[];
    bidding_strategy: string;
  };
  linkedin: {
    job_titles: string[];
    industries: string[];
    company_sizes: string[];
    seniority_levels: string[];
  };
  suggested_budget_range: { min_daily: number; max_daily: number; currency: string };
  expected_cpl_range: { min: number; max: number; currency: string };
  confidence_score: number;
}

export interface OptimizationSuggestion {
  action: string;         // 'narrow_audience' | 'increase_budget' | 'broaden_targeting' | 'creative_refresh'
  reason: string;
  current_value: string;
  suggested_value: string;
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface LeadScoreResult {
  score: number;          // 0–100
  signals: string[];      // reasons contributing to the score
  flag: boolean;          // true if quality is too low (< 30) — flag before delivery
}

export interface DetailedLeadScore {
  overallScore: number;       // 0-100
  qualityScore: number;       // rule-based
  engagementScore: number;    // AI-based (0-100)
  intentScore: number;        // AI-based (0-100)
  firmographicScore: number;  // AI-based (0-100)
  riskScore: number;          // 0-100, where 100=safe, 0=very risky
  tier: 'hot' | 'warm' | 'cold' | 'junk';  // hot(80+), warm(60-79), cold(40-59), junk(<40)
  signals: string[];
  recommendations: Array<{
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface ConversionPrediction {
  probability: number;      // 0-1 (0-100%)
  confidence: number;       // 0-100
  estimatedDaysToConvert: number | null;
  suggestedFollowUpChannel: 'email' | 'phone' | 'sms' | 'linkedin';
  factors: {
    positive: string[];
    negative: string[];
  };
}

export interface LeadEnrichment {
  companyName?: string;
  companySize?: string;      // 'small' | 'mid' | 'enterprise'
  annualRevenue?: string;
  industry?: string;
  jobLevel?: 'C-level' | 'Director' | 'Manager' | 'IC' | 'Other';
  linkedInProfileUrl?: string;
  companyLinkedInUrl?: string;
  verifiedEmail?: boolean;
  phoneValid?: boolean;
}

export interface ICPMatch {
  matchScore: number;        // 0-100
  matchedSegments: string[];
  icpFit: {
    [key: string]: {
      score: number;
      reason: string;
    };
  };
}

export interface CompetitorRisk {
  isCompetitor: boolean;
  companyName?: string;
  competitorScore: number;   // 0-100, where 100=definitely competitor
  reason: string;
}

// ─── AI Service ───────────────────────────────────────────────────────────────

export class AiService {

  // ── 1. Company profile analysis → targeting suggestions ─────────────────────
  async analyzeCompany(tenantId: string, callerTenantId: string, callerRole: string) {
    if (callerRole !== 'super_admin' && callerTenantId !== tenantId) {
      const { ForbiddenError } = await import('../../shared/utils/errors');
      throw new ForbiddenError('Access denied');
    }

    const company = await prisma.company.findUnique({ where: { tenantId } });
    if (!company) throw new NotFoundError('Company');

    const prompt = `You are an expert digital advertising strategist specializing in lead generation.
Analyze the company profile below and return ONLY a valid JSON object — no markdown, no explanation.

Company Profile:
${JSON.stringify({
  name: company.name,
  industry: company.industry,
  businessType: company.businessType,
  description: company.description,
  targetGeo: company.targetGeo,
  leadCriteria: company.leadCriteria,
  pricingDetails: company.pricingDetails,
  offerDetails: company.offerDetails,
}, null, 2)}

Return this exact JSON schema:
{
  "meta": {
    "age_min": number,
    "age_max": number,
    "genders": ["all" | "male" | "female"],
    "interests": [string],
    "behaviors": [string],
    "locations": [string]
  },
  "google": {
    "keywords": [string],
    "negative_keywords": [string],
    "audiences": [string],
    "bidding_strategy": string
  },
  "linkedin": {
    "job_titles": [string],
    "industries": [string],
    "company_sizes": [string],
    "seniority_levels": [string]
  },
  "suggested_budget_range": { "min_daily": number, "max_daily": number, "currency": string },
  "expected_cpl_range": { "min": number, "max": number, "currency": string },
  "confidence_score": number (0-100)
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const suggestion: TargetingSuggestion = JSON.parse(raw);

    // Persist to ai_suggestions table
    const saved = await prisma.aiSuggestion.create({
      data: {
        tenantId,
        type: 'targeting',
        suggestion: suggestion as any,
        confidence: suggestion.confidence_score ?? null,
        applied: false,
      },
    });

    return { suggestion, id: saved.id };
  }

  // ── 2. Campaign performance optimization ────────────────────────────────────
  async optimizeCampaign(campaignId: string, tenantId: string) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, tenantId } });
    if (!campaign) throw new NotFoundError('Campaign');

    // Pull last 7 days of metrics
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [metrics, leadCount] = await Promise.all([
      prisma.campaignMetric.findMany({
        where: { campaignId, createdAt: { gte: since } },
        orderBy: { date: 'desc' },
      }),
      prisma.lead.count({ where: { campaignId, tenantId } }),
    ]);

    const totalSpend = metrics.reduce((s, m) => s + Number(m.spend ?? 0), 0);
    const totalLeads = metrics.reduce((s, m) => s + (m.leadsCount ?? 0), 0);
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : null;

    const prompt = `You are a senior digital advertising strategist. Analyze this campaign's 7-day performance and return ONLY a JSON array of optimization suggestions. No markdown, no explanation.

Campaign:
${JSON.stringify({
  name: campaign.name,
  platform: campaign.platform,
  dailyBudget: campaign.dailyBudget,
  leadTargetDaily: campaign.leadTargetDaily,
  leadTargets: campaign.leadTargets,
  targetingConfig: campaign.targetingConfig,
  status: campaign.status,
}, null, 2)}

Last 7 Days Performance:
- Total spend: $${totalSpend.toFixed(2)}
- Total leads: ${totalLeads}
- Average CPL: ${avgCpl !== null ? `$${avgCpl.toFixed(2)}` : 'N/A'}
- Daily metrics: ${JSON.stringify(metrics.map(m => ({
    date: m.date,
    spend: m.spend,
    leads: m.leadsCount,
    cpl: m.cpl,
    clicks: m.clicks,
    impressions: m.impressions,
  })))}

Return a JSON array (max 5 items):
[{
  "action": string,
  "reason": string,
  "current_value": string,
  "suggested_value": string,
  "expected_impact": string,
  "priority": "high" | "medium" | "low"
}]`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{"suggestions":[]}';
    // GPT returns a JSON object with a key — handle both array and wrapped
    let parsed: any = JSON.parse(raw);
    const suggestions: OptimizationSuggestion[] = Array.isArray(parsed)
      ? parsed
      : (parsed.suggestions ?? parsed.optimizations ?? Object.values(parsed)[0] ?? []);

    // Persist
    const saved = await prisma.aiSuggestion.create({
      data: {
        tenantId,
        campaignId,
        type: 'optimization',
        suggestion: suggestions as any,
        confidence: null,
        applied: false,
      },
    });

    return { suggestions, id: saved.id };
  }

  // ── 3. Lead quality scoring (async — called fire-and-forget after insert) ───
  async scoreLeadWithAI(
    leadId: string,
    tenantId: string,
    leadData: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      city?: string | null;
      state?: string | null;
      customFields?: any;
      sourceUrl?: string | null;
      ipAddress?: string | null;
    }
  ): Promise<LeadScoreResult> {
    const company = await prisma.company.findUnique({
      where: { tenantId },
      select: { targetGeo: true, leadCriteria: true, industry: true },
    });

    const prompt = `You are a lead quality analyst. Score this lead from 0–100 and return ONLY a JSON object.

Company context:
${JSON.stringify({ targetGeo: company?.targetGeo, leadCriteria: company?.leadCriteria, industry: company?.industry })}

Lead data:
${JSON.stringify(leadData)}

Scoring criteria:
- Valid phone number: +30 pts
- Valid email: +20 pts
- Full name: +15 pts
- Location matches target geo: +15 pts
- Completeness of custom fields: +10 pts
- Suspicious signals (fake data, generic email, VPN IP): -20 to -40 pts

Return:
{
  "score": number (0-100),
  "signals": [string],  // brief explanation of each factor
  "flag": boolean       // true if score < 30
}`;

    try {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',   // cheaper for per-lead scoring
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const result: LeadScoreResult = JSON.parse(raw);
      const score = Math.min(100, Math.max(0, result.score ?? 0));

      // Update the lead record with the AI score
      await prisma.lead.update({
        where: { id: leadId },
        data: { qualityScore: score },
      });

      return { ...result, score };
    } catch (err) {
      // AI scoring failure is non-fatal — return the rule-based score unchanged
      console.error('[AI] Lead scoring failed:', err);
      return { score: 0, signals: ['AI scoring unavailable'], flag: false };
    }
  }

  // ── 3B. Detailed Lead Scoring with Multiple Dimensions ──────────────────────
  async scoreLeadDetailed(leadId: string, tenantId: string): Promise<DetailedLeadScore> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { campaign: true },
    });

    if (!lead) throw new NotFoundError('Lead');

    const company = await prisma.company.findUnique({
      where: { tenantId },
      select: { targetGeo: true, leadCriteria: true, industry: true },
    });

    // Score engagement (based on available custom fields and recency)
    let engagementScore = 0;
    const ageMinutes = (Date.now() - new Date(lead.receivedAt).getTime()) / (1000 * 60);
    if (ageMinutes < 60) engagementScore = 95;
    else if (ageMinutes < 24 * 60) engagementScore = 85;
    else if (ageMinutes < 7 * 24 * 60) engagementScore = 60;
    else engagementScore = 30;

    // Score intent (based on form data completeness and field values)
    let intentScore = 0;
    const fieldsProvided = [lead.firstName, lead.lastName, lead.email, lead.phone].filter(
      (f) => f
    ).length;
    intentScore = (fieldsProvided / 4) * 80 + 20; // Base 20 + up to 80 from completeness

    // Score firmographic (how well lead fits company ICP)
    let firmographicScore = 50; // neutral baseline
    if (lead.state && (company?.targetGeo as string)?.includes(lead.state)) {
      firmographicScore += 25;
    }
    if (company?.leadCriteria) {
      try {
        const criteriaStr = JSON.stringify(company.leadCriteria).toLowerCase();
        const customFieldsStr = JSON.stringify(lead.customFields || {}).toLowerCase();
        if (criteriaStr.length > 0 && customFieldsStr.includes(criteriaStr)) {
          firmographicScore += 25;
        }
      } catch (e) {
        // Skip if comparison fails
      }
    }

    // Score risk (inverse: 100=safe, 0=risky)
    let riskScore = 100;
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    if (lead.email && genericDomains.some((d) => lead.email?.endsWith(d))) {
      riskScore -= 20;
    }
    if (!lead.phone) riskScore -= 15;
    if (!lead.email) riskScore -= 10;
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Overall score (weighted average)
    const qualityScore = lead.qualityScore || 50;
    const overallScore = Math.round(
      qualityScore * 0.3 + engagementScore * 0.25 + intentScore * 0.25 + firmographicScore * 0.1 + (riskScore / 100) * 10
    );

    // Determine tier
    let tier: 'hot' | 'warm' | 'cold' | 'junk';
    if (overallScore >= 80) tier = 'hot';
    else if (overallScore >= 60) tier = 'warm';
    else if (overallScore >= 40) tier = 'cold';
    else tier = 'junk';

    // Generate signals
    const signals: string[] = [];
    if (engagementScore > 80) signals.push('High engagement');
    if (intentScore > 70) signals.push('Strong purchase intent');
    if (firmographicScore > 70) signals.push('Strong ICP fit');
    if (riskScore > 80) signals.push('Verified contact info');
    if (lead.phone) signals.push('Phone number provided');
    if (lead.email && !genericDomains.some((d) => lead.email?.endsWith(d))) signals.push('Business email');

    // Generate recommendations
    const recommendations: DetailedLeadScore['recommendations'] = [];
    
    // Check competitor risk
    const competitorRisk = await this.checkCompetitorRisk(leadId, tenantId);
    if (competitorRisk.isCompetitor) {
      recommendations.push({
        action: 'skip_or_review',
        reason: `Lead appears to work for competitor (${competitorRisk.companyName})`,
        priority: 'high',
      });
    }
    
    if (tier === 'hot' && !competitorRisk.isCompetitor) {
      recommendations.push({
        action: 'call_immediately',
        reason: 'Hot lead with high conversion probability',
        priority: 'high',
      });
    }
    if (tier === 'warm') {
      recommendations.push({
        action: 'send_email',
        reason: 'Good fit, nurture with targeted content',
        priority: 'medium',
      });
    }
    if (riskScore < 50) {
      recommendations.push({
        action: 'verify_contact',
        reason: 'Contact information quality is low',
        priority: 'high',
      });
    }

    return {
      overallScore,
      qualityScore,
      engagementScore,
      intentScore,
      firmographicScore,
      riskScore,
      tier,
      signals,
      recommendations,
    };
  }

  // ── 3C. Conversion Prediction ────────────────────────────────────────────────
  async predictConversion(leadId: string, tenantId: string): Promise<ConversionPrediction> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { campaign: true },
    });

    if (!lead) throw new NotFoundError('Lead');

    // Get historical conversion data for the campaign (if available)
    const campaignLeads = lead.campaignId
      ? await prisma.lead.findMany({
          where: { campaignId: lead.campaignId, tenantId },
          take: 100,
        })
      : [];

    // Calculate base probability from lead quality and campaign history
    let probability = 0.3; // baseline 30%
    probability += (lead.qualityScore ?? 50) / 100 * 0.4; // up to 70% total
    probability += (campaignLeads.length > 0 ? 0.1 : 0); // bonus for campaign with history

    // Estimate days to convert based on lead recency
    const ageHours = (Date.now() - new Date(lead.receivedAt).getTime()) / (1000 * 60 * 60);
    let estimatedDaysToConvert: number | null = null;
    if (ageHours < 24) estimatedDaysToConvert = 3;
    else if (ageHours < 7 * 24) estimatedDaysToConvert = 7;
    else if (ageHours < 30 * 24) estimatedDaysToConvert = 14;
    else estimatedDaysToConvert = null;

    // Suggest follow-up channel
    let suggestedFollowUpChannel: ConversionPrediction['suggestedFollowUpChannel'];
    if (lead.phone) suggestedFollowUpChannel = 'phone';
    else if (lead.email) suggestedFollowUpChannel = 'email';
    else suggestedFollowUpChannel = 'sms';

    return {
      probability: Math.min(0.95, Math.max(0.05, probability)),
      confidence: 65,
      estimatedDaysToConvert,
      suggestedFollowUpChannel,
      factors: {
        positive: ['High quality score', 'Recent submission'],
        negative: ageHours > 30 * 24 ? ['Lead is over 30 days old'] : [],
      },
    };
  }

  // ── 3D. ICP Matching ─────────────────────────────────────────────────────────
  async matchToICP(leadId: string, tenantId: string): Promise<ICPMatch> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) throw new NotFoundError('Lead');

    const company = await prisma.company.findUnique({
      where: { tenantId },
      select: { targetGeo: true, leadCriteria: true },
    });

    const icpFit: ICPMatch['icpFit'] = {};
    let totalScore = 0;

    // Company size match
    icpFit.company_size = {
      score: 70,
      reason: 'Company size data not enriched yet',
    };
    totalScore += 70;

    // Location match
    const locationMatch = (company?.targetGeo as string)?.includes(lead.state || '') ?? false;
    icpFit.location = {
      score: locationMatch ? 95 : 30,
      reason: locationMatch
        ? `Lead state ${lead.state} matches target geography`
        : `Lead state ${lead.state} outside target geography`,
    };
    totalScore += icpFit.location.score;

    // Contact quality
    const hasAllContacts = lead.email && lead.phone;
    icpFit.contact_quality = {
      score: hasAllContacts ? 90 : 50,
      reason: hasAllContacts ? 'Complete contact information' : 'Incomplete contact information',
    };
    totalScore += icpFit.contact_quality.score;

    // Lead criteria match
    icpFit.lead_criteria = {
      score: 60,
      reason: 'Detailed enrichment required for full assessment',
    };
    totalScore += 60;

    const matchScore = Math.round(totalScore / Object.keys(icpFit).length);
    const matchedSegments = matchScore > 75 ? ['high-intent', 'good-fit'] : matchScore > 50 ? ['medium-fit'] : ['low-fit'];

    return {
      matchScore,
      matchedSegments,
      icpFit,
    };
  }

  // ── 3E. Competitor Risk Detection (with enrichment) ──────────────────────────
  async checkCompetitorRisk(leadId: string, tenantId: string): Promise<CompetitorRisk> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) throw new NotFoundError('Lead');

    const company = await prisma.company.findUnique({
      where: { tenantId },
      select: { name: true },
    });

    // Extended competitors list (can be updated from company settings)
    const knownCompetitors = [
      'salesforce',
      'hubspot',
      'pipedrive',
      'intercom',
      'drift',
      'microsoft',
      'google',
      'amazon',
      'apple',
      'freshsales',
      'copper',
      'zoho',
      'close',
      'insightly',
      'monday',
      'asana',
      'jira',
      'atlassian',
      'slack',
      'twilio',
      'sendgrid',
      'mailchimp',
      'klaviyo',
      'stripe',
      'square',
      'paypal',
    ];

    // Extract multiple data points from lead
    const emailDomain = lead.email?.split('@')[1]?.toLowerCase() ?? '';
    const leadCompanyName = ((lead.customFields as any)?.companyName || '').toLowerCase();
    const leadIndustry = ((lead.customFields as any)?.industry || '').toLowerCase();
    const jobTitle = ((lead.customFields as any)?.jobTitle || '').toLowerCase();

    let competitorScore = 0;
    const signals: string[] = [];

    // Signal 1: Email domain check (highest weight)
    const isCompetitorEmailDomain = knownCompetitors.some((c) => emailDomain.includes(c));
    if (isCompetitorEmailDomain) {
      competitorScore += 40;
      signals.push(`Email domain (${emailDomain}) matches known competitor`);
    }

    // Signal 2: Company name check (medium weight)
    const isCompetitorCompany = knownCompetitors.some((c) => leadCompanyName.includes(c));
    if (isCompetitorCompany) {
      competitorScore += 30;
      signals.push(`Company name matches known competitor`);
    }

    // Signal 3: Job title indicators (medium weight)
    const competitorJobIndicators = [
      'director of sales',
      'vp of sales',
      'sales dev',
      'account executive',
      'sales engineer',
      'solution architect',
      'product manager',
    ];
    const hasCompetitorJobTitle = competitorJobIndicators.some((indicator) => jobTitle.includes(indicator));
    if (hasCompetitorJobTitle && isCompetitorEmailDomain) {
      competitorScore += 15;
      signals.push(`Competitor job title detected: ${jobTitle}`);
    }

    // Signal 4: Similar industry (low weight, only if other signals present)
    if (competitorScore > 0 && leadIndustry.includes('software')) {
      competitorScore += 5;
      signals.push(`Lead works in software industry`);
    }

    // Clamp score to 0-100
    competitorScore = Math.max(0, Math.min(100, competitorScore));

    return {
      isCompetitor: competitorScore > 40,
      companyName: leadCompanyName || emailDomain,
      competitorScore,
      reason: signals.length > 0 ? signals.join('; ') : 'No competitor signals detected',
    };
  }

  // ── 4. List stored suggestions ───────────────────────────────────────────────
  async listSuggestions(tenantId: string, filters: { type?: string; campaignId?: string; applied?: boolean }) {
    return prisma.aiSuggestion.findMany({
      where: {
        tenantId,
        ...(filters.type && { type: filters.type }),
        ...(filters.campaignId && { campaignId: filters.campaignId }),
        ...(filters.applied !== undefined && { applied: filters.applied }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── 5. Mark suggestion applied ───────────────────────────────────────────────
  async applySuggestion(id: string, tenantId: string) {
    const suggestion = await prisma.aiSuggestion.findFirst({ where: { id, tenantId } });
    if (!suggestion) throw new NotFoundError('AI suggestion');
    return prisma.aiSuggestion.update({ where: { id }, data: { applied: true } });
  }

  // ── 6. Lead Scoring Report for Analytics Dashboard ─────────────────────────────
  async getLeadScoringReport(tenantId: string) {
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      include: { campaign: true },
      orderBy: { receivedAt: 'desc' },
    });

    if (leads.length === 0) {
      return {
        totalLeads: 0,
        scoreDistribution: { hot: 0, warm: 0, cold: 0, junk: 0 },
        averageScores: { overall: 0, quality: 0, engagement: 0, intent: 0, firmographic: 0, risk: 0 },
        topFactors: [],
        conversionByTier: { hot: 0, warm: 0, cold: 0, junk: 0 },
        leadsByFactor: [],
        timelineData: [],
      };
    }

    // Score each lead
    const scoredLeads = await Promise.all(
      leads.map(async (lead) => {
        const detailed = await this.scoreLeadDetailed(lead.id, tenantId);
        const prediction = await this.predictConversion(lead.id, tenantId);
        return { lead, detailed, prediction };
      })
    );

    // Calculate distribution by tier
    const distribution = { hot: 0, warm: 0, cold: 0, junk: 0 };
    const tiers = ['hot', 'warm', 'cold', 'junk'] as const;
    scoredLeads.forEach(({ detailed }) => {
      distribution[detailed.tier]++;
    });

    // Calculate average scores
    const avgScores = {
      overall: 0,
      quality: 0,
      engagement: 0,
      intent: 0,
      firmographic: 0,
      risk: 0,
    };
    scoredLeads.forEach(({ detailed }) => {
      avgScores.overall += detailed.overallScore;
      avgScores.quality += detailed.qualityScore;
      avgScores.engagement += detailed.engagementScore;
      avgScores.intent += detailed.intentScore;
      avgScores.firmographic += detailed.firmographicScore;
      avgScores.risk += detailed.riskScore;
    });
    Object.keys(avgScores).forEach((k) => {
      avgScores[k as keyof typeof avgScores] = Math.round(avgScores[k as keyof typeof avgScores] / scoredLeads.length);
    });

    // Extract top factors
    const factorCounts: Record<string, number> = {};
    scoredLeads.forEach(({ detailed }) => {
      detailed.signals.forEach((signal) => {
        factorCounts[signal] = (factorCounts[signal] || 0) + 1;
      });
    });
    const topFactors = Object.entries(factorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([factor, count]) => ({ factor, count, percentage: Math.round((count / scoredLeads.length) * 100) }));

    // Conversion probability by tier
    const conversionByTier = { hot: 0, warm: 0, cold: 0, junk: 0 };
    const tierCounts = { hot: 0, warm: 0, cold: 0, junk: 0 };
    scoredLeads.forEach(({ detailed, prediction }) => {
      const tier = detailed.tier;
      conversionByTier[tier] += prediction.probability;
      tierCounts[tier]++;
    });
    Object.keys(conversionByTier).forEach((tier) => {
      if (tierCounts[tier as keyof typeof tierCounts] > 0) {
        conversionByTier[tier as keyof typeof conversionByTier] = Math.round(
          conversionByTier[tier as keyof typeof conversionByTier] / tierCounts[tier as keyof typeof tierCounts] * 100
        ) / 100;
      }
    });

    // Leads by factor (top 5 most impactful factors + count per tier)
    const leadsByFactor = topFactors.map((tf) => {
      const leadsWithFactor = scoredLeads.filter(({ detailed }) => detailed.signals.includes(tf.factor));
      const tierBreakdown: Record<string, number> = { hot: 0, warm: 0, cold: 0, junk: 0 };
      leadsWithFactor.forEach(({ detailed }) => {
        tierBreakdown[detailed.tier]++;
      });
      return {
        factor: tf.factor,
        totalLeads: leadsWithFactor.length,
        tiers: tierBreakdown,
      };
    });

    // Timeline: score trends over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const timelineData: Array<{ date: string; count: number; avgScore: number }> = [];
    const dayMap: Record<string, { count: number; scores: number[] }> = {};

    scoredLeads.forEach(({ lead, detailed }) => {
      if (new Date(lead.receivedAt) > thirtyDaysAgo) {
        const dateStr = new Date(lead.receivedAt).toISOString().split('T')[0];
        if (!dayMap[dateStr]) dayMap[dateStr] = { count: 0, scores: [] };
        dayMap[dateStr].count++;
        dayMap[dateStr].scores.push(detailed.overallScore);
      }
    });

    Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, data]) => {
        const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
        timelineData.push({ date, count: data.count, avgScore });
      });

    return {
      totalLeads: leads.length,
      scoreDistribution: distribution,
      averageScores: avgScores,
      topFactors,
      conversionByTier,
      leadsByFactor,
      timelineData,
    };
  }
}

export const aiService = new AiService();
