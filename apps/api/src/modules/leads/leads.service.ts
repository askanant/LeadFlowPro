import { AuditService } from '../../shared/services/audit.service';
import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';
import { config } from '../../config';
import { leadQualityService } from './lead-quality.service';
import { leadDeduplicationService } from './lead-deduplication.service';
import { billingService } from '../billing/billing.service';
import { LoggerService } from '../../shared/services/logger.service';
import { WorkflowService } from '../workflows/service';
import { getTenantFilter } from '../../shared/utils/tenant-filter';

export class LeadsService {
  async list(
    tenantId: string,
    role: string | undefined,
    filters: {
      status?: string;
      campaignId?: string;
      platform?: string;
      quality?: 'excellent' | 'good' | 'fair' | 'poor';
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    // Quality tier thresholds
    const qualityRanges: Record<string, [number, number]> = {
      excellent: [80, 100],
      good: [60, 79],
      fair: [40, 59],
      poor: [0, 39],
    };

    const qualityRange = filters.quality ? qualityRanges[filters.quality] : undefined;

    // Apply tenant filtering based on role
    const tenantFilter = getTenantFilter(tenantId, role);

    const where = {
      ...tenantFilter,
      ...(filters.status && { status: filters.status }),
      ...(filters.campaignId && { campaignId: filters.campaignId }),
      ...(filters.platform && { platform: filters.platform }),
      ...(qualityRange && {
        qualityScore: {
          gte: qualityRange[0],
          lte: qualityRange[1],
        },
      }),
      ...(filters.from || filters.to
        ? {
            receivedAt: {
              ...(filters.from && { gte: filters.from }),
              ...(filters.to && { lte: filters.to }),
            },
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          campaign: { select: { id: true, name: true, platform: true } },
          deliveries: { select: { channel: true, status: true, deliveredAt: true } },
          callLogs: {
            select: { id: true, status: true, durationSeconds: true, startedAt: true },
            take: 1,
            orderBy: { startedAt: 'desc' },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return { leads, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getById(id: string, tenantId: string, role: string | undefined) {
    // Apply tenant filtering based on role
    const tenantFilter = getTenantFilter(tenantId, role);

    const lead = await prisma.lead.findFirst({
      where: { id, ...tenantFilter },
      include: {
        campaign: true,
        deliveries: true,
        callLogs: {
          include: { phoneNumber: { select: { number: true } } },
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundError('Lead');
    return lead;
  }

  async getAuditTrail(id: string, tenantId: string, role: string | undefined) {
    const lead = await this.getById(id, tenantId, role);
    const matches = await prisma.leadCallMatch.findMany({
      where: { leadId: id },
      include: { callLog: { select: { status: true, durationSeconds: true } } },
    });

    return {
      lead: {
        id: lead.id,
        name: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim(),
        phone: lead.phone,
        email: lead.email,
        receivedAt: lead.receivedAt,
        platform: lead.platform,
        platformLeadId: lead.platformLeadId,
        qualityScore: lead.qualityScore,
        status: lead.status,
      },
      deliveries: lead.deliveries.map((d) => ({
        channel: d.channel,
        status: d.status,
        deliveredAt: d.deliveredAt,
        deliveryLog: d.deliveryLog,
      })),
      calls: lead.callLogs.map((c) => ({
        from: c.fromNumber,
        to: c.toNumber,
        startedAt: c.startedAt,
        duration: c.durationSeconds,
        status: c.status,
        recordingUrl: c.recordingUrl,
      })),
      matchConfidence: matches[0]?.confidence ?? null,
      summary: this.buildAuditSummary(lead, matches),
    };
  }

  async ingestLead(
    tenantId: string,
    data: {
      campaignId?: string;
      platform: string;
      platformLeadId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      city?: string;
      state?: string;
      customFields?: any;
      sourceUrl?: string;
      ipAddress?: string;
    }
  ) {
    // Deduplication by platform lead ID (highest priority)
    if (data.platformLeadId) {
      const existing = await prisma.lead.findFirst({
        where: { tenantId, platform: data.platform, platformLeadId: data.platformLeadId },
      });
      if (existing) return { lead: existing, duplicate: true };

    // ✅ Check billing quota before ingesting
    const canStore = await billingService.canStoreLead(tenantId, undefined);
    if (!canStore) {
      throw new Error('Lead quota exceeded for this billing cycle');
    }
    }

    // Check for cross-platform duplicates (email/phone within 24h)
    const isDuplicate = await leadDeduplicationService.isDuplicate(tenantId, data, 95);

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        ...data,
        qualityScore: leadQualityService.calculateQualityScore(data).total,
        status: isDuplicate ? 'duplicate' : 'new',
      },
    });

    // Fire-and-forget AI scoring — upgrades qualityScore asynchronously
    // so webhook response isn't blocked by GPT latency
    if (config.OPENAI_API_KEY) {
      import('../ai/ai.service').then(({ aiService }) => {
        aiService.scoreLeadWithAI(lead.id, tenantId, data).catch((err) => {
          LoggerService.logError('[AI] Async lead scoring error', err);
        });
      });
    }

    return { lead, duplicate: isDuplicate };
  }

  async updateStatus(id: string, tenantId: string, role: string | undefined, status: string) {
    // Apply tenant filtering based on role
    const tenantFilter = getTenantFilter(tenantId, role);

    const lead = await prisma.lead.findFirst({ where: { id, ...tenantFilter } });
    if (!lead) throw new NotFoundError('Lead');
    
    // Update lead status
    const updatedLead = await prisma.lead.update({ where: { id }, data: { status } });
    
    // Audit log: lead status changed
    AuditService.logSuccess({
      tenantId,
      action: 'update_lead_status',
      resource: 'lead',
      resourceId: id,
    }).catch(err => LoggerService.logError('Audit log failed', err));
    
    // Trigger workflows on status change
    try {
      // Find workflows that match the lead_status_change trigger
      const workflows = await prisma.workflow.findMany({
        where: {
          tenantId,
          status: 'active',
          triggerConfig: { path: ['type'], equals: 'lead_status_change' },
        },
      });
      for (const wf of workflows) {
        await WorkflowService.triggerWorkflow(wf.id, id, tenantId, role, 'lead_status_change');
      }
    } catch (error) {
      LoggerService.logError('Failed to trigger workflow on status change', error);
      // Don't fail the request if workflow trigger fails
    }
    
    return updatedLead;
  }

  /**
   * Get quality score breakdown for a lead
   */
  async getQualityBreakdown(leadId: string, tenantId: string, role: string | undefined) {
    const lead = await this.getById(leadId, tenantId, role);
    const breakdown = leadQualityService.calculateQualityScore(lead);
    return breakdown;
  }

  /**
   * Recalculate quality score for a specific lead
   */
  async recalculateQualityScore(leadId: string, tenantId: string, role: string | undefined) {
    const lead = await this.getById(leadId, tenantId, role);
    return leadQualityService.updateLeadQualityScore(lead.id, lead.tenantId);
  }

  /**
   * Get quality distribution stats for tenant
   */
  async getQualityDistribution(tenantId: string, role: string | undefined) {
    // For super admin, fetch across all tenants; for regular users, fetch for their tenant only
    const targetTenantId = role === 'super_admin' ? undefined : tenantId;

    if (targetTenantId) {
      return leadQualityService.getQualityDistribution(targetTenantId);
    } else {
      // Super admin: get aggregated distribution across all leads
      const distribution = await prisma.lead.aggregate({
        _count: {
          qualityScore: true,
        },
        _avg: {
          qualityScore: true,
        },
      });

      return {
        averageScore: distribution._avg.qualityScore ?? 0,
        totalLeads: distribution._count.qualityScore,
      };
    }
  }

  /**
   * Find duplicate leads for a tenant
   */
  async findDuplicates(tenantId: string, leadId: string, role: string | undefined) {
    const lead = await this.getById(leadId, tenantId, role);
    return leadDeduplicationService.findDuplicates(lead.tenantId, lead);
  }

  /**
   * Get duplicate statistics
   */
  async getDuplicateStats(tenantId: string, role: string | undefined) {
    // For super admin, fetch across all tenants; for regular users, fetch for their tenant only
    const targetTenantId = role === 'super_admin' ? undefined : tenantId;

    if (targetTenantId) {
      return leadDeduplicationService.getDuplicateStats(targetTenantId);
    } else {
      // Super admin: get aggregated stats across all leads
      const duplicates = await prisma.lead.count({
        where: { status: 'duplicate' },
      });

      return {
        totalDuplicates: duplicates,
        duplicateRate: 0,
      };
    }
  }

  /**
   * Merge two duplicate leads
   */
  async mergeDuplicates(tenantId: string, primaryLeadId: string, duplicateLeadId: string, role: string | undefined) {
    // Verify both leads belong to tenant (or super admin can access any tenant)
    const primaryLead = await this.getById(primaryLeadId, tenantId, role);
    const duplicateLead = await this.getById(duplicateLeadId, tenantId, role);
    return leadDeduplicationService.mergeDuplicates(primaryLead.tenantId, primaryLeadId, duplicateLeadId);
  }

  /**
   * Auto-merge all duplicates for a tenant
   */
  async autoMergeDuplicates(tenantId: string, role: string | undefined) {
    // For super admin, this would be a dangerous operation, so we restrict it
    if (role === 'super_admin') {
      throw new Error('Auto-merge duplicates is not allowed for super admin to prevent accidental data modification across multiple tenants');
    }

    return leadDeduplicationService.autoMergeDuplicates(tenantId, 95);
  }

  async getCalls(id: string, tenantId: string, role: string | undefined) {
    const lead = await this.getById(id, tenantId, role);
    return lead.callLogs.map((c) => ({
      id: c.id,
      fromNumber: c.fromNumber,
      toNumber: c.toNumber,
      startedAt: c.startedAt,
      durationSeconds: c.durationSeconds,
      status: c.status,
      recordingUrl: c.recordingUrl,
    }));
  }

  async addNote(id: string, tenantId: string, role: string | undefined, content: string) {
    const lead = await this.getById(id, tenantId, role);
    const note = await prisma.leadNote.create({
      data: {
        leadId: id,
        content,
        createdBy: tenantId,
      },
    });
    
    // Audit log: note added to lead
    AuditService.logSuccess({
      tenantId,
      action: 'add_lead_note',
      resource: 'lead',
      resourceId: id,
    }).catch(err => LoggerService.logError('Audit log failed', err));
    return note;
  }

  async getNotes(id: string, tenantId: string, role: string | undefined) {
    const lead = await this.getById(id, tenantId, role);
    return prisma.leadNote.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildAuditSummary(lead: any, _matches: any[]): string {
    const parts: string[] = [];
    if (lead.receivedAt) {
      parts.push(`Lead received at ${new Date(lead.receivedAt).toLocaleTimeString()}.`);
    }
    if (lead.deliveries.length > 0) {
      const delivered = lead.deliveries.find((d: any) => d.status === 'delivered');
      if (delivered) {
        parts.push(
          `Delivered via ${delivered.channel} at ${new Date(delivered.deliveredAt).toLocaleTimeString()}.`
        );
      }
    }
    if (lead.callLogs.length > 0) {
      const call = lead.callLogs[0];
      if (call.startedAt) {
        parts.push(
          `Client called at ${new Date(call.startedAt).toLocaleTimeString()}, ${call.durationSeconds ?? 0}s conversation recorded.`
        );
      }
    }
    return parts.join(' ') || 'No activity recorded yet.';
  }
}

export const leadsService = new LeadsService();
