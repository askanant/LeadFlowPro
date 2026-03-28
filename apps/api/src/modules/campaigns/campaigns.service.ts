import { AuditService } from '../../shared/services/audit.service';
import { prisma } from '../../shared/database/prisma';
import { config } from '../../config';
import { NotFoundError } from '../../shared/utils/errors';
import { getAdPlatformProvider } from './providers';
import { getTenantFilter } from '../../shared/utils/tenant-filter';

export class CampaignsService {
  async list(tenantId: string, role: string | undefined, filters?: { platform?: string; status?: string }) {
    return prisma.campaign.findMany({
      where: {
        ...getTenantFilter(tenantId, role),
        ...(filters?.platform && { platform: filters.platform }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } },
    });
  }

  async getById(id: string, tenantId: string, role: string | undefined) {
    const campaign = await prisma.campaign.findFirst({ where: { id, ...getTenantFilter(tenantId, role) } });
    if (!campaign) throw new NotFoundError('Campaign');
    return campaign;
  }

  async create(
    tenantId: string,
    role: string | undefined,
    data: {
      name: string;
      platform: string;
      dailyBudget?: number;
      totalBudget?: number;
      leadTargetDaily?: number;
      leadTargets?: any;
      targetingConfig?: any;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const campaign = await prisma.campaign.create({ data: { tenantId, ...data } });
  }

  async updateStatus(id: string, tenantId: string, role: string | undefined, status: string) {
    const campaign = await prisma.campaign.findFirst({ where: { id, ...getTenantFilter(tenantId, role) } });
    if (!campaign) throw new NotFoundError('Campaign');

    const updated = await prisma.campaign.update({ where: { id }, data: { status } });

    // Audit log: campaign status changed
    AuditService.logSuccess({
      tenantId,
      action: 'update_campaign_status',
      resource: 'campaign',
      resourceId: campaign.id,
    }).catch((err) => console.error('Audit log failed:', err));

    return updated;
  }

  async launch(id: string, tenantId: string, role: string | undefined) {
    const campaign = await prisma.campaign.findFirst({ where: { id, ...getTenantFilter(tenantId, role) } });
    if (!campaign) throw new NotFoundError('Campaign');

    const creds = await prisma.adPlatformCredential.findFirst({
      where: { tenantId: campaign.tenantId, platform: campaign.platform, isValid: true },
    });
    if (!creds?.accessToken || !creds.accountId) {
      throw new Error(`No valid ${campaign.platform} credentials configured for this company`);
    }

    // Get platform provider
    const provider = getAdPlatformProvider(campaign.platform);

    // Launch campaign on the ad platform
    const result = await provider.launch(
      {
        name: campaign.name,
        dailyBudget: campaign.dailyBudget?.toNumber(),
        totalBudget: campaign.totalBudget?.toNumber(),
        leadTargetDaily: campaign.leadTargetDaily || undefined,
        targetingConfig: campaign.targetingConfig || undefined,
        startDate: campaign.startDate || undefined,
        endDate: campaign.endDate || undefined,
      },
      {
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken ?? undefined,
        accountId: creds.accountId ?? undefined,
        appId: creds.appId ?? undefined,
        appSecret: creds.appSecret ?? undefined,
        extraConfig: creds.extraConfig,
      }
    );

    return prisma.campaign.update({
      where: { id },
      data: { platformCampaignId: result.platformCampaignId, status: result.status },
    });
  }

  async pause(id: string, tenantId: string, role: string | undefined) {
    const campaign = await prisma.campaign.findFirst({ where: { id, ...getTenantFilter(tenantId, role) } });
    if (!campaign) throw new NotFoundError('Campaign');
    if (!campaign.platformCampaignId) {
      throw new Error('Campaign has not been launched yet');
    }

    const creds = await prisma.adPlatformCredential.findFirst({
      where: { tenantId: campaign.tenantId, platform: campaign.platform, isValid: true },
    });
    if (!creds?.accessToken) {
      throw new Error(`No valid ${campaign.platform} credentials configured for this company`);
    }

    const provider = getAdPlatformProvider(campaign.platform);
    await provider.pause(campaign.platformCampaignId, {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken ?? undefined,
      accountId: creds.accountId ?? undefined,
      appId: creds.appId ?? undefined,
      appSecret: creds.appSecret ?? undefined,
      extraConfig: creds.extraConfig,
    });

    return prisma.campaign.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async resume(id: string, tenantId: string, role: string | undefined) {
    const campaign = await prisma.campaign.findFirst({ where: { id, ...getTenantFilter(tenantId, role) } });
    if (!campaign) throw new NotFoundError('Campaign');
    if (!campaign.platformCampaignId) {
      throw new Error('Campaign has not been launched yet');
    }

    const creds = await prisma.adPlatformCredential.findFirst({
      where: { tenantId: campaign.tenantId, platform: campaign.platform, isValid: true },
    });
    if (!creds?.accessToken) {
      throw new Error(`No valid ${campaign.platform} credentials configured for this company`);
    }

    const provider = getAdPlatformProvider(campaign.platform);
    await provider.resume(campaign.platformCampaignId, {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken ?? undefined,
      accountId: creds.accountId ?? undefined,
      appId: creds.appId ?? undefined,
      appSecret: creds.appSecret ?? undefined,
      extraConfig: creds.extraConfig,
    });

    return prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  async getMetrics(id: string, tenantId: string, role: string | undefined) {
    const campaign = await prisma.campaign.findFirst({ where: { id, ...getTenantFilter(tenantId, role) } });
    if (!campaign) throw new NotFoundError('Campaign');

    const [metrics, leadCount, callCount] = await Promise.all([
      prisma.campaignMetric.findMany({
        where: { campaignId: id },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.lead.count({ where: { campaignId: id, tenantId: campaign.tenantId } }),
      prisma.callLog.count({
        where: {
          tenantId: campaign.tenantId,
          lead: { campaignId: id },
        },
      }),
    ]);

    return { campaign, metrics, leadCount, callCount };
  }
}

export const campaignsService = new CampaignsService();
