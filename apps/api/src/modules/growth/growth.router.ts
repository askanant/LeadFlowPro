import { Router } from 'express';
import { growthService } from './growth.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';

export const growthRouter = Router();
growthRouter.use(requireAuth);

/**
 * @swagger
 * /growth/campaign-optimizer:
 *   get:
 *     tags: [Growth]
 *     summary: Campaign conversion analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign optimization data
 * /growth/campaign-optimizer/recommendations:
 *   get:
 *     tags: [Growth]
 *     summary: Campaign optimization recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Optimization recommendations
 * /growth/spend-optimizer:
 *   get:
 *     tags: [Growth]
 *     summary: Spend analysis data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Spend analysis
 * /growth/spend-optimizer/recommendations:
 *   get:
 *     tags: [Growth]
 *     summary: Budget optimization recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget recommendations
 * /growth/lead-flow:
 *   get:
 *     tags: [Growth]
 *     summary: Lead flow analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lead flow data
 * /growth/lead-flow/recommendations:
 *   get:
 *     tags: [Growth]
 *     summary: Growth recommendations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Growth recommendations
 */

// ─── Campaign Optimizer ────────────────────────────────────────────────

growthRouter.get('/campaign-optimizer', async (req, res) => {
  const analytics = await growthService.getCampaignConversionAnalytics(req.auth.tenantId, req.auth.role);
  sendSuccess(res, analytics);
});

growthRouter.get('/campaign-optimizer/recommendations', async (req, res) => {
  const recs = await growthService.getCampaignRecommendations(req.auth.tenantId, req.auth.role);
  sendSuccess(res, recs);
});

// ─── Spend Optimizer ───────────────────────────────────────────────────

growthRouter.get('/spend-optimizer', async (req, res) => {
  const analytics = await growthService.getSpendAnalytics(req.auth.tenantId, req.auth.role);
  sendSuccess(res, analytics);
});

growthRouter.get('/spend-optimizer/recommendations', async (req, res) => {
  const recs = await growthService.getBudgetRecommendations(req.auth.tenantId, req.auth.role);
  sendSuccess(res, recs);
});

// ─── Lead Flow Booster ─────────────────────────────────────────────────

growthRouter.get('/lead-flow', async (req, res) => {
  const analytics = await growthService.getLeadFlowAnalytics(req.auth.tenantId, req.auth.role);
  sendSuccess(res, analytics);
});

growthRouter.get('/lead-flow/recommendations', async (req, res) => {
  const recs = await growthService.getGrowthRecommendations(req.auth.tenantId, req.auth.role);
  sendSuccess(res, recs);
});
