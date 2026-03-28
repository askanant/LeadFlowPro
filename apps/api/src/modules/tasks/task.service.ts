import { prisma } from '../../shared/database/prisma';

export interface CreateTaskInput {
  tenantId: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  leadId?: string;
  workflowExecutionId?: string;
  createdBy?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export class TaskService {
  static async list(
    tenantId: string,
    params: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      leadId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, priority, assigneeId, leadId, page = 1, limit = 50 } = params;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (leadId) where.leadId = leadId;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
          lead: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  static async getById(id: string, tenantId: string) {
    return prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
      },
    });
  }

  static async create(input: CreateTaskInput) {
    return prisma.task.create({
      data: {
        tenantId: input.tenantId,
        title: input.title,
        description: input.description,
        priority: input.priority || 'medium',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assigneeId: input.assigneeId || null,
        leadId: input.leadId || null,
        workflowExecutionId: input.workflowExecutionId || null,
        createdBy: input.createdBy || null,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
      },
    });
  }

  static async update(id: string, tenantId: string, input: UpdateTaskInput) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) return null;

    const data: any = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;

    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'completed' && task.status !== 'completed') {
        data.completedAt = new Date();
      } else if (input.status !== 'completed') {
        data.completedAt = null;
      }
    }

    return prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
      },
    });
  }

  static async delete(id: string, tenantId: string) {
    const task = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) return null;
    await prisma.task.delete({ where: { id } });
    return task;
  }

  static async getMyTasks(tenantId: string, userId: string) {
    return prisma.task.findMany({
      where: {
        tenantId,
        assigneeId: userId,
        status: { in: ['open', 'in_progress'] },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 20,
    });
  }

  static async getOverdue(tenantId: string) {
    return prisma.task.findMany({
      where: {
        tenantId,
        status: { in: ['open', 'in_progress'] },
        dueDate: { lt: new Date() },
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  static async getStats(tenantId: string) {
    const [open, inProgress, completed, overdue] = await Promise.all([
      prisma.task.count({ where: { tenantId, status: 'open' } }),
      prisma.task.count({ where: { tenantId, status: 'in_progress' } }),
      prisma.task.count({ where: { tenantId, status: 'completed' } }),
      prisma.task.count({
        where: {
          tenantId,
          status: { in: ['open', 'in_progress'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);
    return { open, inProgress, completed, overdue };
  }
}
