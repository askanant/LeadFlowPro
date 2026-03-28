import { prisma } from '../../shared/database/prisma';

export interface DuplicateMatch {
  existingLeadId: string;
  newLeadData: any;
  matchType: 'email' | 'phone' | 'email_and_phone';
  confidence: number; // 0-100
}

export class LeadDeduplicationService {
  /**
   * Find potential duplicates for a new lead within last 24 hours
   */
  async findDuplicates(tenantId: string, leadData: any): Promise<DuplicateMatch[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const matches: DuplicateMatch[] = [];

    // Search by email
    if (leadData.email) {
      const emailMatches = await prisma.lead.findMany({
        where: {
          tenantId,
          email: leadData.email,
          receivedAt: { gte: oneDayAgo },
          id: { not: leadData.id }, // Exclude self if updating
        },
        take: 5,
      });

      for (const match of emailMatches) {
        matches.push({
          existingLeadId: match.id,
          newLeadData: leadData,
          matchType: 'email',
          confidence: 95, // Email matches are very reliable
        });
      }
    }

    // Search by phone
    if (leadData.phone && !this.hasEmailMatch(matches)) {
      const phoneMatches = await prisma.lead.findMany({
        where: {
          tenantId,
          phone: leadData.phone,
          receivedAt: { gte: oneDayAgo },
          id: { not: leadData.id },
        },
        take: 5,
      });

      for (const match of phoneMatches) {
        matches.push({
          existingLeadId: match.id,
          newLeadData: leadData,
          matchType: 'phone',
          confidence: 90, // Phone matches are reliable
        });
      }
    }

    // Search by email AND phone if both available
    if (leadData.email && leadData.phone) {
      const strictMatches = await prisma.lead.findMany({
        where: {
          tenantId,
          AND: [
            { email: leadData.email },
            { phone: leadData.phone },
            { receivedAt: { gte: oneDayAgo } },
            { id: { not: leadData.id } },
          ],
        },
        take: 5,
      });

      if (strictMatches.length > 0) {
        // Clear other matches and use only the strict match
        matches.length = 0;
        for (const match of strictMatches) {
          matches.push({
            existingLeadId: match.id,
            newLeadData: leadData,
            matchType: 'email_and_phone',
            confidence: 99, // Email + phone match is extremely reliable
          });
        }
      }
    }

    return matches;
  }

  /**
   * Check if a lead is a duplicate (high confidence match exists)
   */
  async isDuplicate(
    tenantId: string,
    leadData: any,
    confidenceThreshold: number = 90
  ): Promise<boolean> {
    const matches = await this.findDuplicates(tenantId, leadData);
    return matches.length > 0 && matches[0].confidence >= confidenceThreshold;
  }

  /**
   * Merge duplicate leads, keeping the most complete data
   */
  async mergeDuplicates(tenantId: string, primaryLeadId: string, duplicateLeadId: string) {
    const primaryLead = await prisma.lead.findFirst({
      where: { id: primaryLeadId, tenantId },
    });

    const duplicateLead = await prisma.lead.findFirst({
      where: { id: duplicateLeadId, tenantId },
    });

    if (!primaryLead || !duplicateLead) {
      throw new Error('One or both leads not found');
    }

    // Merge data, preferring filled fields
    const mergedData = {
      firstName: primaryLead.firstName || duplicateLead.firstName,
      lastName: primaryLead.lastName || duplicateLead.lastName,
      email: primaryLead.email || duplicateLead.email,
      phone: primaryLead.phone || duplicateLead.phone,
      city: primaryLead.city || duplicateLead.city,
      state: primaryLead.state || duplicateLead.state,
      customFields: { ...(duplicateLead.customFields as Record<string, any> ?? {}), ...(primaryLead.customFields as Record<string, any> ?? {}) },
    };

    // Update primary lead with merged data
    await prisma.lead.update({
      where: { id: primaryLeadId },
      data: mergedData,
    });

    // Move any deliveries from duplicate to primary
    await prisma.leadDelivery.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // Move any call logs from duplicate to primary
    await prisma.leadCallMatch.updateMany({
      where: { leadId: duplicateLeadId },
      data: { leadId: primaryLeadId },
    });

    // Mark duplicate as deleted (soft delete by status)
    await prisma.lead.update({
      where: { id: duplicateLeadId },
      data: { status: 'duplicate' },
    });

    return primaryLeadId;
  }

  /**
   * Find and auto-merge duplicates for a tenant
   */
  async autoMergeDuplicates(tenantId: string, confidenceThreshold: number = 95) {
    const leads = await prisma.lead.findMany({
      where: { tenantId, status: { not: 'duplicate' } },
      orderBy: { receivedAt: 'desc' },
    });

    let mergedCount = 0;

    for (let i = 0; i < leads.length; i++) {
      const currentLead = leads[i];

      // Skip if already marked as duplicate
      if (currentLead.status === 'duplicate') continue;

      for (let j = i + 1; j < leads.length; j++) {
        const potentialDuplicate = leads[j];

        // Skip if already marked as duplicate
        if (potentialDuplicate.status === 'duplicate') continue;

        // Check for high-confidence match
        if (
          (currentLead.email &&
            potentialDuplicate.email &&
            currentLead.email === potentialDuplicate.email &&
            confidenceThreshold <= 95) ||
          (currentLead.phone &&
            potentialDuplicate.phone &&
            currentLead.phone === potentialDuplicate.phone &&
            confidenceThreshold <= 90)
        ) {
          // Merge the newer lead into the older one
          const isCurrentNewer = currentLead.receivedAt > potentialDuplicate.receivedAt;
          const primaryId = isCurrentNewer ? potentialDuplicate.id : currentLead.id;
          const duplicateId = isCurrentNewer ? currentLead.id : potentialDuplicate.id;

          await this.mergeDuplicates(tenantId, primaryId, duplicateId);
          mergedCount++;
          break; // Move to next lead
        }
      }
    }

    return mergedCount;
  }

  /**
   * Get duplicate statistics for a tenant
   */
  async getDuplicateStats(tenantId: string) {
    const duplicateCount = await prisma.lead.count({
      where: { tenantId, status: 'duplicate' },
    });

    const totalCount = await prisma.lead.count({
      where: { tenantId },
    });

    return {
      duplicateCount,
      totalCount,
      duplicatePercentage: totalCount > 0 ? Math.round((duplicateCount / totalCount) * 100) : 0,
    };
  }

  // ─── Helper Methods ───────────────────────────────────────────────────────

  private hasEmailMatch(matches: DuplicateMatch[]): boolean {
    return matches.some((m) => m.matchType === 'email' || m.matchType === 'email_and_phone');
  }
}

export const leadDeduplicationService = new LeadDeduplicationService();
