import { Router } from 'express';
import { z } from 'zod';
import { agentsService } from './agents.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';

export const agentsRouter = Router();

agentsRouter.use(requireAuth);

/**
 * @swagger
 * /agents:
 *   get:
 *     tags: [Agents]
 *     summary: List agents for tenant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agents
 *   post:
 *     tags: [Agents]
 *     summary: Create new agent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [viewer, company_admin]
 *     responses:
 *       201:
 *         description: Agent created
 * /agents/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Get agent by ID
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
 *         description: Agent details
 *   delete:
 *     tags: [Agents]
 *     summary: Deactivate agent
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
 *         description: Agent deactivated
 */

// GET /api/v1/agents
agentsRouter.get('/', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const agents = await agentsService.list(tenantId, req.auth.role);
  sendSuccess(res, agents);
});

// GET /api/v1/agents/:id
agentsRouter.get('/:id', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const agent = await agentsService.getById(req.params.id, tenantId, req.auth.role);
  sendSuccess(res, agent);
});

// POST /api/v1/agents
agentsRouter.post('/', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const { email, firstName, lastName, role } = z
    .object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.enum(['viewer', 'company_admin']).optional(),
    })
    .parse(req.body);

  const result = await agentsService.create(tenantId, {
    email,
    firstName,
    lastName,
    role,
  });

  sendSuccess(res, result);
});

// DELETE /api/v1/agents/:id
agentsRouter.delete('/:id', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const result = await agentsService.deactivate(req.params.id, tenantId, req.auth.role);
  sendSuccess(res, result);
});
