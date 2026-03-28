import { Lead } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';

export interface QualityScoreBreakdown {
  emailValid: number; // 0-20
  phoneValid: number; // 0-20
  dataCompleteness: number; // 0-30
  geolocationValid: number; // 0-15
  recency: number; // 0-15
  total: number; // 0-100
  tier: 'excellent' | 'good' | 'fair' | 'poor';
}

export class LeadQualityService {
  /**
   * Calculate quality score for a lead (0-100)
   */
  calculateQualityScore(lead: Partial<Lead>): QualityScoreBreakdown {
    let score = 0;
    const breakdown: QualityScoreBreakdown = {
      emailValid: 0,
      phoneValid: 0,
      dataCompleteness: 0,
      geolocationValid: 0,
      recency: 0,
      total: 0,
      tier: 'poor',
    };

    // Email validation (0-20 points)
    if (lead.email && this.isValidEmail(lead.email)) {
      breakdown.emailValid = 20;
      score += 20;
    } else if (lead.email) {
      breakdown.emailValid = 5; // Partial credit for having email even if invalid format
      score += 5;
    }

    // Phone validation (0-20 points)
    if (lead.phone && this.isValidPhone(lead.phone)) {
      breakdown.phoneValid = 20;
      score += 20;
    } else if (lead.phone) {
      breakdown.phoneValid = 5; // Partial credit for having phone
      score += 5;
    }

    // Data completeness (0-30 points)
    const completenessScore = this.scoreDataCompleteness(lead);
    breakdown.dataCompleteness = completenessScore;
    score += completenessScore;

    // Geolocation validation (0-15 points)
    if ((lead.city || lead.state) && this.isValidLocation(lead.city, lead.state)) {
      breakdown.geolocationValid = 15;
      score += 15;
    } else if (lead.city || lead.state) {
      breakdown.geolocationValid = 8;
      score += 8;
    }

    // Recency (0-15 points) - leads received recently score higher
    if (lead.receivedAt) {
      const ageHours = (Date.now() - new Date(lead.receivedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 1) {
        breakdown.recency = 15;
        score += 15;
      } else if (ageHours < 24) {
        breakdown.recency = 10;
        score += 10;
      } else if (ageHours < 7 * 24) {
        breakdown.recency = 5;
        score += 5;
      }
    }

    breakdown.total = Math.min(100, Math.max(0, score));
    breakdown.tier = this.getTier(breakdown.total);

    return breakdown;
  }

  /**
   * Update lead quality score in database
   */
  async updateLeadQualityScore(leadId: string, tenantId: string): Promise<number> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const breakdown = this.calculateQualityScore(lead);

    await prisma.lead.update({
      where: { id: leadId },
      data: { qualityScore: breakdown.total },
    });

    return breakdown.total;
  }

  /**
   * Recalculate quality scores for all leads in a tenant
   */
  async recalculateTenantLeads(tenantId: string): Promise<number> {
    const leads = await prisma.lead.findMany({
      where: { tenantId },
    });

    let updated = 0;

    for (const lead of leads) {
      const breakdown = this.calculateQualityScore(lead);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { qualityScore: breakdown.total },
      });
      updated++;
    }

    return updated;
  }

  /**
   * Get quality score distribution for tenant (for analytics)
   */
  async getQualityDistribution(tenantId: string) {
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      select: { qualityScore: true },
    });

    const distribution = {
      excellent: 0, // 80-100
      good: 0, // 60-79
      fair: 0, // 40-59
      poor: 0, // 0-39
      total: leads.length,
    };

    for (const lead of leads) {
      const score = lead.qualityScore || 0;
      if (score >= 80) distribution.excellent++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else distribution.poor++;
    }

    return {
      ...distribution,
      averageScore: leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / leads.length) : 0,
    };
  }

  // ─── Helper Methods ───────────────────────────────────────────────────────

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Valid if between 7-15 digits (covers most international formats)
    return digits.length >= 7 && digits.length <= 15;
  }

  private scoreDataCompleteness(lead: Partial<Lead>): number {
    let score = 0;
    const maxPoints = 30;
    const fieldPoints = maxPoints / 6; // Distribute across 6 key fields

    if (lead.firstName) score += fieldPoints;
    if (lead.lastName) score += fieldPoints;
    if (lead.email) score += fieldPoints;
    if (lead.phone) score += fieldPoints;
    if (lead.city) score += fieldPoints;
    if (lead.state) score += fieldPoints;

    return Math.round(score);
  }

  private isValidLocation(city?: string | null, state?: string | null): boolean {
    // Very basic validation - just check if values are reasonable length
    if (city && city.length > 2 && city.length < 50) return true;
    if (state && state.length > 1 && state.length < 50) return true;
    return false;
  }

  private getTier(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }
}

export const leadQualityService = new LeadQualityService();
