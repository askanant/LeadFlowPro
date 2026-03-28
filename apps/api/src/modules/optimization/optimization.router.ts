import { Router } from 'express';
import { budgetOptimizationService } from './budget-optimization.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';

export const optimizationRouter = Router();

optimizationRouter.use(requireAuth);

// POST /api/v1/optimization/campaigns/:campaignId/optimize-budget
// Get budget optimization recommendation and optionally apply it
optimizationRouter.post('/campaigns/:campaignId/optimize-budget', async (req, res) => {
  const { campaignId } = req.params;
  const { apply } = req.body as { apply?: boolean };

  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  try {
    const recommendation = await budgetOptimizationService.getOptimizationRecommendations(
      campaignId,
      tenantId
    );

    sendSuccess(res, {
      recommendation,
      message: apply ? 'Budget optimized' : 'Recommendation generated (not applied)',
      applied: apply ?? false,
    });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// POST /api/v1/optimization/optimize-all
// Optimize all active campaigns for the tenant
optimizationRouter.post('/optimize-all', async (req, res) => {
  try {
    const { tenantId } = req.auth!;
    const results = await budgetOptimizationService.optimizeAllCampaigns(
      tenantId
    );

    sendSuccess(res, {
      results,
      summary: {
        total: results.length,
        optimized: results.filter((r) => r.newBudget !== r.previousBudget).length,
        totalSavings: results.reduce((s, r) => s + (r.previousBudget - r.newBudget), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/v1/optimization/campaigns/:campaignId/recommendation
// Get budget recommendation without applying
optimizationRouter.get('/campaigns/:campaignId/recommendation', async (req, res) => {
  const { campaignId } = req.params;
  const { tenantId } = req.auth!;

  try {
    const recommendation = await budgetOptimizationService.getOptimizationRecommendations(
      campaignId,
      tenantId
    );

    sendSuccess(res, recommendation);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});
