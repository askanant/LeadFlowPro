import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';

// ─── Churn Prediction ────────────────────────────────────────────────────────

export interface ChurnRiskResult {
  leadId: string;
  churnRisk: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: { factor: string; impact: number; detail: string }[];
  recommendation: string;
  lastActivityAt: string | null;
  daysSinceLastActivity: number | null;
}

// ─── Smart Lead Routing ──────────────────────────────────────────────────────

export interface RoutingRecommendation {
  leadId: string;
  recommendedAgentId: string;
  recommendedAgentName: string;
  reason: string;
  confidence: number; // 0-100
  alternatives: { agentId: string; agentName: string; score: number; reason: string }[];
}

// ─── Best Contact Time ───────────────────────────────────────────────────────

export interface BestContactTime {
  leadId: string;
  bestTimes: { day: string; hour: number; label: string; confidence: number }[];
  timezone: string;
  reasoning: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AdvancedAIService {
  /**
   * Analyze churn risk for a lead based on engagement patterns
   */
  async getChurnRisk(leadId: string, tenantId: string): Promise<ChurnRiskResult> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        callLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
        tasks: { where: { status: { in: ['open', 'in_progress'] } } },
        notes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!lead) throw new NotFoundError('Lead not found');

    const factors: ChurnRiskResult['factors'] = [];
    let totalRisk = 0;

    // Factor 1: Days since last activity
    const lastActivityDate = lead.lastActivityAt
      ?? lead.activities[0]?.createdAt
      ?? lead.callLogs[0]?.startedAt
      ?? null;

    const daysSinceLastActivity = lastActivityDate
      ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastActivity === null) {
      factors.push({ factor: 'no_activity', impact: 30, detail: 'No recorded activity' });
      totalRisk += 30;
    } else if (daysSinceLastActivity > 30) {
      factors.push({ factor: 'inactive_30d', impact: 35, detail: `No activity for ${daysSinceLastActivity} days` });
      totalRisk += 35;
    } else if (daysSinceLastActivity > 14) {
      factors.push({ factor: 'inactive_14d', impact: 20, detail: `No activity for ${daysSinceLastActivity} days` });
      totalRisk += 20;
    } else if (daysSinceLastActivity > 7) {
      factors.push({ factor: 'inactive_7d', impact: 10, detail: `No activity for ${daysSinceLastActivity} days` });
      totalRisk += 10;
    }

    // Factor 2: Activity frequency
    const recentActivityCount = lead.activities.filter(
      (a) => Date.now() - new Date(a.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    ).length;

    if (recentActivityCount === 0) {
      factors.push({ factor: 'low_engagement', impact: 20, detail: 'Zero activities in last 30 days' });
      totalRisk += 20;
    } else if (recentActivityCount < 3) {
      factors.push({ factor: 'low_engagement', impact: 10, detail: `Only ${recentActivityCount} activities in last 30 days` });
      totalRisk += 10;
    }

    // Factor 3: Call engagement
    const recentCalls = lead.callLogs.filter(
      (c) => c.startedAt && Date.now() - new Date(c.startedAt).getTime() < 30 * 24 * 60 * 60 * 1000
    );
    const answeredCalls = recentCalls.filter((c) => c.status === 'completed');

    if (recentCalls.length === 0) {
      factors.push({ factor: 'no_calls', impact: 10, detail: 'No recent call attempts' });
      totalRisk += 10;
    } else if (answeredCalls.length === 0 && recentCalls.length > 0) {
      factors.push({ factor: 'unanswered_calls', impact: 15, detail: `${recentCalls.length} calls, none answered` });
      totalRisk += 15;
    }

    // Factor 4: Lead status stagnation
    const statusAge = Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (lead.status === 'new' && statusAge > 14) {
      factors.push({ factor: 'stale_status', impact: 15, detail: `Status "new" for ${statusAge} days` });
      totalRisk += 15;
    } else if (lead.status === 'contacted' && statusAge > 30) {
      factors.push({ factor: 'stale_status', impact: 10, detail: `Status "contacted" for ${statusAge} days` });
      totalRisk += 10;
    }

    // Factor 5: Open tasks (positive signal reduces risk)
    if (lead.tasks.length > 0) {
      factors.push({ factor: 'active_tasks', impact: -10, detail: `${lead.tasks.length} open task(s)` });
      totalRisk -= 10;
    }

    // Clamp 0-100
    const churnRisk = Math.max(0, Math.min(100, totalRisk));

    const riskLevel: ChurnRiskResult['riskLevel'] =
      churnRisk >= 75 ? 'critical' :
      churnRisk >= 50 ? 'high' :
      churnRisk >= 25 ? 'medium' : 'low';

    const recommendation =
      churnRisk >= 75 ? 'Immediate outreach required — high risk of losing this lead' :
      churnRisk >= 50 ? 'Schedule a follow-up call or email within the next 48 hours' :
      churnRisk >= 25 ? 'Consider scheduling a check-in within the next week' :
      'Lead is actively engaged — continue current cadence';

    // Persist churn risk to lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { churnRisk },
    });

    return {
      leadId,
      churnRisk,
      riskLevel,
      factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
      recommendation,
      lastActivityAt: lastActivityDate?.toISOString() ?? null,
      daysSinceLastActivity,
    };
  }

  /**
   * Recommend the best agent for a lead based on workload, past performance, and specialization
   */
  async getRoutingRecommendation(leadId: string, tenantId: string): Promise<RoutingRecommendation> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { campaign: true },
    });

    if (!lead) throw new NotFoundError('Lead not found');

    // Get all active agents for this tenant
    const agents = await prisma.user.findMany({
      where: { tenantId, isActive: true, role: { in: ['company_admin', 'viewer'] } },
      include: {
        tasksAssigned: {
          where: { status: { in: ['open', 'in_progress'] } },
        },
        _count: {
          select: {
            tasksAssigned: true,
            tasksCreated: true,
          },
        },
      },
    });

    if (agents.length === 0) {
      throw new NotFoundError('No active agents found for routing');
    }

    // Score each agent
    const scored = agents.map((agent) => {
      let score = 50; // base score
      const reasons: string[] = [];

      // Factor 1: Current workload (lower is better)
      const openTasks = agent.tasksAssigned.length;
      if (openTasks === 0) {
        score += 25;
        reasons.push('No open tasks — available immediately');
      } else if (openTasks <= 3) {
        score += 15;
        reasons.push(`Low workload (${openTasks} open tasks)`);
      } else if (openTasks <= 7) {
        score += 5;
        reasons.push(`Moderate workload (${openTasks} open tasks)`);
      } else {
        score -= 15;
        reasons.push(`High workload (${openTasks} open tasks)`);
      }

      // Factor 2: Total tasks handled (experience)
      const totalHandled = agent._count.tasksAssigned;
      if (totalHandled > 50) {
        score += 15;
        reasons.push('Highly experienced agent');
      } else if (totalHandled > 20) {
        score += 10;
        reasons.push('Experienced agent');
      }

      // Factor 3: Role-based priority (admins slightly preferred for high-value leads)
      if (agent.role === 'company_admin' && (lead.qualityScore ?? 0) >= 70) {
        score += 10;
        reasons.push('Admin assigned for high-quality lead');
      }

      return {
        agentId: agent.id,
        agentName: [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email,
        score: Math.max(0, Math.min(100, score)),
        reason: reasons.join('; '),
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    return {
      leadId,
      recommendedAgentId: best.agentId,
      recommendedAgentName: best.agentName,
      reason: best.reason,
      confidence: best.score,
      alternatives: scored.slice(1, 4),
    };
  }

  /**
   * Suggest optimal contact times based on lead timezone and historical engagement
   */
  async getBestContactTime(leadId: string, tenantId: string): Promise<BestContactTime> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        callLogs: { orderBy: { startedAt: 'desc' }, take: 30 },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!lead) throw new NotFoundError('Lead not found');

    // Infer timezone from state/city (simplified US mapping)
    const timezone = inferTimezone(lead.state, lead.city);

    // Analyze historical engagement patterns
    const engagementByHour = new Map<number, { total: number; successful: number }>();
    const engagementByDay = new Map<string, { total: number; successful: number }>();

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Analyze call patterns
    for (const call of lead.callLogs) {
      if (!call.startedAt) continue;
      const d = new Date(call.startedAt);
      const hour = d.getHours();
      const day = days[d.getDay()];
      const isSuccess = call.status === 'completed';

      const hourEntry = engagementByHour.get(hour) ?? { total: 0, successful: 0 };
      hourEntry.total++;
      if (isSuccess) hourEntry.successful++;
      engagementByHour.set(hour, hourEntry);

      const dayEntry = engagementByDay.get(day) ?? { total: 0, successful: 0 };
      dayEntry.total++;
      if (isSuccess) dayEntry.successful++;
      engagementByDay.set(day, dayEntry);
    }

    // Analyze activity timestamps
    for (const activity of lead.activities) {
      const d = new Date(activity.createdAt);
      const hour = d.getHours();
      const day = days[d.getDay()];

      const hourEntry = engagementByHour.get(hour) ?? { total: 0, successful: 0 };
      hourEntry.total++;
      hourEntry.successful++;
      engagementByHour.set(hour, hourEntry);

      const dayEntry = engagementByDay.get(day) ?? { total: 0, successful: 0 };
      dayEntry.total++;
      dayEntry.successful++;
      engagementByDay.set(day, dayEntry);
    }

    // Generate best times
    const bestTimes: BestContactTime['bestTimes'] = [];

    if (engagementByHour.size > 0) {
      // Sort hours by success rate
      const hourScores = [...engagementByHour.entries()]
        .map(([hour, data]) => ({
          hour,
          rate: data.total > 0 ? data.successful / data.total : 0,
          volume: data.total,
        }))
        .sort((a, b) => b.rate - a.rate || b.volume - a.volume);

      // Sort days by success rate
      const dayScores = [...engagementByDay.entries()]
        .map(([day, data]) => ({
          day,
          rate: data.total > 0 ? data.successful / data.total : 0,
          volume: data.total,
        }))
        .sort((a, b) => b.rate - a.rate || b.volume - a.volume);

      // Cross-reference best hours with best days
      const topDays = dayScores.slice(0, 3);
      const topHours = hourScores.slice(0, 3);

      for (const day of topDays) {
        for (const hour of topHours) {
          bestTimes.push({
            day: day.day,
            hour: hour.hour,
            label: `${day.day} ${formatHour(hour.hour)}`,
            confidence: Math.round(((day.rate + hour.rate) / 2) * 100),
          });
        }
      }

      bestTimes.sort((a, b) => b.confidence - a.confidence);
    }

    // If no historical data, return business-hours defaults
    if (bestTimes.length === 0) {
      const defaults = [
        { day: 'Tuesday', hour: 10, label: 'Tuesday 10:00 AM', confidence: 65 },
        { day: 'Wednesday', hour: 14, label: 'Wednesday 2:00 PM', confidence: 60 },
        { day: 'Thursday', hour: 11, label: 'Thursday 11:00 AM', confidence: 55 },
      ];
      bestTimes.push(...defaults);
    }

    const reasoning = engagementByHour.size > 0
      ? `Based on ${lead.callLogs.length} call(s) and ${lead.activities.length} activity record(s)`
      : 'Default business hours — no historical engagement data available';

    return {
      leadId,
      bestTimes: bestTimes.slice(0, 6),
      timezone,
      reasoning,
    };
  }
}

function inferTimezone(state: string | null, _city: string | null): string {
  if (!state) return 'America/New_York';
  const s = state.toLowerCase();
  const pacific = ['ca', 'california', 'wa', 'washington', 'or', 'oregon', 'nv', 'nevada'];
  const mountain = ['co', 'colorado', 'az', 'arizona', 'ut', 'utah', 'mt', 'montana', 'nm', 'new mexico'];
  const central = ['tx', 'texas', 'il', 'illinois', 'mn', 'minnesota', 'wi', 'wisconsin', 'mo', 'missouri', 'tn', 'tennessee'];
  if (pacific.includes(s)) return 'America/Los_Angeles';
  if (mountain.includes(s)) return 'America/Denver';
  if (central.includes(s)) return 'America/Chicago';
  return 'America/New_York';
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

export const advancedAIService = new AdvancedAIService();
