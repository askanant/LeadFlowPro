import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { AuditService } from '../../shared/services/audit.service';
import { sendSuccess } from '../../shared/utils/response';
import { prisma } from '../../shared/database/prisma';

export const auditRouter = Router();

// All audit endpoints require authentication + super_admin or company_admin
auditRouter.use(requireAuth, requireRole('super_admin', 'company_admin'));

/**
 * @swagger
 * /audit:
 *   get:
 *     tags: [Audit]
 *     summary: List audit logs
 *     description: Paginated audit log entries with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs
 * /audit/actions:
 *   get:
 *     tags: [Audit]
 *     summary: Get distinct audit actions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of action types
 * /audit/resources:
 *   get:
 *     tags: [Audit]
 *     summary: Get distinct audit resources
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resource types
 * /audit/{id}:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit log entry by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit log entry
 */

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().optional(),
  resource: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/v1/audit-logs
auditRouter.get('/', async (req, res) => {
  const { page, limit, action, resource, userId, startDate, endDate } = listSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const where: any = { tenantId: req.auth.tenantId };
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendSuccess(res, logs, { page, limit, total, totalPages: Math.ceil(total / limit) });
});

// GET /api/v1/audit-logs/actions — Get distinct actions for filter dropdown
auditRouter.get('/actions', async (req, res) => {
  const actions = await prisma.auditLog.findMany({
    where: { tenantId: req.auth.tenantId },
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
  });
  sendSuccess(res, actions.map((a) => a.action));
});

// GET /api/v1/audit-logs/resources — Get distinct resources for filter dropdown
auditRouter.get('/resources', async (req, res) => {
  const resources = await prisma.auditLog.findMany({
    where: { tenantId: req.auth.tenantId },
    distinct: ['resource'],
    select: { resource: true },
    orderBy: { resource: 'asc' },
  });
  sendSuccess(res, resources.map((r) => r.resource));
});

// GET /api/v1/audit-logs/:id
auditRouter.get('/:id', async (req, res) => {
  const log = await prisma.auditLog.findFirst({
    where: { id: req.params.id, tenantId: req.auth.tenantId },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!log) {
    res.status(404).json({ error: { message: 'Audit log not found' } });
    return;
  }
  sendSuccess(res, log);
});
