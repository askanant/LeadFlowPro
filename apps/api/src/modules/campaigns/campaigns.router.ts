import { Router } from 'express';
import { z } from 'zod';
import { campaignsService } from './campaigns.service';
import { aiService } from '../ai/ai.service';
import { billingService } from '../billing/billing.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess, sendError } from '../../shared/utils/response';

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

const campaignBodySchema = z.object({
  name: z.string().min(2).max(200),
  platform: z.enum(['meta', 'google', 'linkedin', 'microsoft', 'taboola']),
  dailyBudget: z.number().positive().max(1000000).optional(),
  totalBudget: z.number().positive().max(10000000).optional(),
  leadTargetDaily: z.number().int().positive().optional(),
  leadTargets: z.any().optional(),
  targetingConfig: z.any().optional(),
  startDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  endDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

/**
 * @swagger
 * /campaigns:
 *   get:
 *     tags: [Campaigns]
 *     summary: List all campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Campaign list
 */
campaignsRouter.get('/', async (req, res) => {
  const { platform, status } = req.query as { platform?: string; status?: string };
  const campaigns = await campaignsService.list(req.auth.tenantId, req.auth.role, { platform, status });
  sendSuccess(res, campaigns);
});

// GET /api/v1/campaigns/:id
campaignsRouter.get('/:id', async (req, res) => {
  const campaign = await campaignsService.getById(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, campaign);
});

// POST /api/v1/campaigns
campaignsRouter.post('/', async (req, res) => {
  try {
    // Check billing quota before allowing campaign creation
    const canCreate = await billingService.canCreateCampaign(req.auth.tenantId, req.auth.role);
    if (!canCreate) {
      return sendError(
        res,
        'Campaign limit reached',
        'Upgrade your plan to create more campaigns',
        402
      );
    }

    const data = campaignBodySchema.parse(req.body);
    const campaign = await campaignsService.create(req.auth.tenantId, req.auth.role, data);
    sendSuccess(res, campaign, undefined, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return sendError(res, 'Validation error', err.errors[0].message, 400);
    }
    throw err;
  }
});

// POST /api/v1/campaigns/:id/pause
campaignsRouter.post('/:id/pause', async (req, res) => {
  const campaign = await campaignsService.pause(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, campaign);
});

// POST /api/v1/campaigns/:id/activate
campaignsRouter.post('/:id/activate', async (req, res) => {
  const campaign = await campaignsService.resume(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, campaign);
});

// POST /api/v1/campaigns/:id/launch  — pushes campaign live on selected platform (Meta, Google, LinkedIn, etc.)
campaignsRouter.post('/:id/launch', async (req, res) => {
  const campaign = await campaignsService.launch(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, campaign);
});

// GET /api/v1/campaigns/:id/metrics
campaignsRouter.get('/:id/metrics', async (req, res) => {
  const metrics = await campaignsService.getMetrics(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, metrics);
});

// POST /api/v1/campaigns/:id/ai-optimize — AI optimization suggestions
campaignsRouter.post('/:id/ai-optimize', async (req, res) => {
  const result = await aiService.optimizeCampaign(req.params['id'], req.auth.tenantId);
  sendSuccess(res, result);
});
