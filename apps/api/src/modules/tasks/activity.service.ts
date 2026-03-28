import { prisma, Prisma } from '../../shared/database/prisma';

export interface CreateActivityInput {
  tenantId: string;
  leadId?: string;
  userId?: string;
  type: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export class ActivityService {
  static async getTimeline(
    tenantId: string,
    leadId: string,
    params: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 30 } = params;

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where: { tenantId, leadId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where: { tenantId, leadId } }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  static async create(input: CreateActivityInput) {
    return prisma.activity.create({
      data: {
        tenantId: input.tenantId,
        leadId: input.leadId || null,
        userId: input.userId || null,
        type: input.type,
        summary: input.summary,
        metadata: (input.metadata || Prisma.DbNull) as any,
      },
    });
  }

  static async getRecent(tenantId: string, limit = 20) {
    return prisma.activity.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
