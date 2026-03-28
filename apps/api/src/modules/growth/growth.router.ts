import { Router } from 'express';
import { growthService } from './growth.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';

export const growthRouter = Router();
growthRouter.use(requireAuth);

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
