import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { prisma } from '../../shared/database/prisma';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

// GET /api/v1/analytics/overview
analyticsRouter.get('/overview', async (req, res) => {
  const { tenantId, role } = req.auth;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Super Admin sees all tenants' data, regular users see only their tenant
  const whereClause = role === 'super_admin' ? {} : { tenantId };

  const [
    totalLeads,
    leadsThisWeek,
    totalCalls,
    callsThisWeek,
    activeCampaigns,
    totalDeliveries,
    deliveredCount,
  ] = await Promise.all([
    prisma.lead.count({ where: whereClause }),
    prisma.lead.count({ where: { ...whereClause, receivedAt: { gte: sevenDaysAgo } } }),
    prisma.callLog.count({ where: whereClause }),
    prisma.callLog.count({ where: { ...whereClause, startedAt: { gte: sevenDaysAgo } } }),
    prisma.campaign.count({ where: { ...whereClause, status: 'active' } }),
    prisma.leadDelivery.count({ where: { ...whereClause, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.leadDelivery.count({
      where: { ...whereClause, status: 'delivered', createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const deliveryRatePercent =
    totalDeliveries > 0 ? Math.round((deliveredCount / totalDeliveries) * 100) : 0;

  sendSuccess(res, {
    totalLeads,
    leadsThisWeek,
    totalCalls,
    callsThisWeek,
    activeCampaigns,
    deliveryRatePercent,
  });
});

// GET /api/v1/analytics/leads?days=30
analyticsRouter.get('/leads', async (req, res) => {
  const { tenantId, role } = req.auth;
  const days = Math.min(parseInt((req.query['days'] as string) ?? '30'), 90);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Build query based on role
  let query = `
    SELECT
      DATE(received_at)::text AS date,
      COUNT(*)::int AS count,
      platform,
      status
    FROM leads
    WHERE received_at >= $1
  `;

  const params: any[] = [startDate];

  if (role !== 'super_admin') {
    query += ` AND tenant_id = $2::uuid`;
    params.push(tenantId);
  }

  query += ` GROUP BY DATE(received_at), platform, status ORDER BY date ASC`;

  const leads = await prisma.$queryRawUnsafe<
    { date: string; count: number; platform: string | null; status: string }[]
  >(query, ...params);

  sendSuccess(res, leads);
});

// GET /api/v1/analytics/calls?days=30
analyticsRouter.get('/calls', async (req, res) => {
  const { tenantId, role } = req.auth;
  const days = Math.min(parseInt((req.query['days'] as string) ?? '30'), 90);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Super Admin sees all tenants' data
  const whereClause = role === 'super_admin' ? {} : { tenantId };

  const [callsByStatus, avgDuration] = await Promise.all([
    prisma.callLog.groupBy({
      by: ['status'],
      where: { ...whereClause, startedAt: { gte: startDate } },
      _count: { _all: true },
    }),
    prisma.callLog.aggregate({
      where: { ...whereClause, status: 'completed', startedAt: { gte: startDate } },
      _avg: { durationSeconds: true },
    }),
  ]);

  sendSuccess(res, {
    callsByStatus: callsByStatus.map((r) => ({ status: r.status, count: r._count._all })),
    avgDurationSeconds: Math.round(avgDuration._avg.durationSeconds ?? 0),
  });
});

// GET /api/v1/analytics/campaigns/:id
analyticsRouter.get('/campaigns/:id', async (req, res) => {
  const { tenantId, role } = req.auth;
  const { id } = req.params;

  // Super Admin can view any campaign, regular users only their own tenant's campaigns
  const whereClause = role === 'super_admin' ? { campaignId: id } : { campaignId: id, tenantId };

  const metrics = await prisma.campaignMetric.findMany({
    where: whereClause,
    orderBy: { date: 'asc' },
    take: 30,
  });

  const totals = await prisma.campaignMetric.aggregate({
    where: whereClause,
    _sum: { spend: true, leadsCount: true, impressions: true, clicks: true },
    _avg: { cpl: true },
  });

  sendSuccess(res, { metrics, totals: totals._sum, avgCpl: totals._avg.cpl });
});
