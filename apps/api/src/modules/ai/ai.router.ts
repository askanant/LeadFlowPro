import { Router } from 'express';
import { z } from 'zod';
import { aiService } from './ai.service';
import { advancedAIService } from './advanced-ai.service';
import { enrichmentService } from './enrichment.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { prisma } from '../../shared/database/prisma';

export const aiRouter = Router();

aiRouter.use(requireAuth);

// GET /api/v1/ai/suggestions
// Query: ?type=targeting|optimization&campaignId=&applied=true|false
aiRouter.get('/suggestions', async (req, res) => {
  const { type, campaignId, applied } = req.query as Record<string, string>;
  const suggestions = await aiService.listSuggestions(req.auth.tenantId, {
    type,
    campaignId,
    applied: applied !== undefined ? applied === 'true' : undefined,
  });
  sendSuccess(res, suggestions);
});

// PATCH /api/v1/ai/suggestions/:id/apply
aiRouter.patch('/suggestions/:id/apply', async (req, res) => {
  const suggestion = await aiService.applySuggestion(req.params['id'], req.auth.tenantId);
  sendSuccess(res, suggestion);
});

// ─── LEAD INTELLIGENCE ENDPOINTS ─────────────────────────────────────────────

// GET /api/v1/ai/leads/:id/scoring-breakdown
// Get detailed lead scoring with engagement, intent, firmographic, and risk scores
aiRouter.get('/leads/:id/scoring-breakdown', async (req, res) => {
  try {
    const breakdown = await aiService.scoreLeadDetailed(req.params['id'], req.auth.tenantId);
    sendSuccess(res, breakdown);
  } catch (error) {
    res.status(400).json({ error: { code: 'SCORING_ERROR', message: (error as Error).message } });
  }
});

// GET /api/v1/ai/leads/:id/conversion-prediction
// Predict conversion probability and estimated days to convert
aiRouter.get('/leads/:id/conversion-prediction', async (req, res) => {
  try {
    const prediction = await aiService.predictConversion(req.params['id'], req.auth.tenantId);
    sendSuccess(res, prediction);
  } catch (error) {
    res.status(400).json({ error: { code: 'PREDICTION_ERROR', message: (error as Error).message } });
  }
});

// GET /api/v1/ai/leads/:id/match-to-icp
// Check how well a lead matches the company's ICP
aiRouter.get('/leads/:id/match-to-icp', async (req, res) => {
  try {
    const match = await aiService.matchToICP(req.params['id'], req.auth.tenantId);
    sendSuccess(res, match);
  } catch (error) {
    res.status(400).json({ error: { code: 'ICP_MATCH_ERROR', message: (error as Error).message } });
  }
});

// GET /api/v1/ai/leads/:id/enrichment
// Get enrichment data (company, email/phone validity, job level, etc.)
aiRouter.get('/leads/:id/enrichment', async (req, res) => {
  try {
    const enrichment = await enrichmentService.getLeadEnrichment(req.params['id'], req.auth.tenantId);
    sendSuccess(res, enrichment);
  } catch (error) {
    res.status(400).json({ error: { code: 'ENRICHMENT_ERROR', message: (error as Error).message } });
  }
});

// GET /api/v1/ai/leads/:id/competitor-risk
// Check if lead works for a known competitor
aiRouter.get('/leads/:id/competitor-risk', async (req, res) => {
  try {
    const risk = await aiService.checkCompetitorRisk(req.params['id'], req.auth.tenantId);
    sendSuccess(res, risk);
  } catch (error) {
    res.status(400).json({ error: { code: 'COMPETITOR_CHECK_ERROR', message: (error as Error).message } });
  }
});

// ─── REPORTING ENDPOINTS ──────────────────────────────────────────────────────────

// GET /api/v1/ai/reports/lead-scoring
// Get aggregated lead scoring statistics for dashboard
aiRouter.get('/reports/lead-scoring', async (req, res) => {
  try {
    const report = await aiService.getLeadScoringReport(req.auth.tenantId);
    sendSuccess(res, report);
  } catch (error) {
    res.status(400).json({ error: { code: 'REPORT_ERROR', message: (error as Error).message } });
  }
});

// POST /api/v1/ai/bulk-score
// Batch score leads by campaign (fires async, returns job ID)
aiRouter.post('/bulk-score', async (req, res) => {
  try {
    const { campaignId } = req.body;
    
    // Get all leads for campaign
    const leads = await prisma.lead.findMany({
      where: {
        tenantId: req.auth.tenantId,
        ...(campaignId && { campaignId }),
      },
      take: 500,
    });

    // Score all leads in parallel (but with rate limiting)
    const batchSize = 10;
    let completed = 0;
    let errors = 0;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (lead: any) => {
          try {
            await aiService.scoreLeadDetailed(lead.id, req.auth.tenantId);
            completed++;
          } catch (err) {
            console.error(`Error scoring lead ${lead.id}:`, err);
            errors++;
          }
        })
      );
    }

    sendSuccess(res, {
      totalLeads: leads.length,
      completed,
      errors,
      campaignId,
    });
  } catch (error) {
    res.status(400).json({ error: { code: 'BULK_SCORE_ERROR', message: (error as Error).message } });
  }
});

// ─── ADVANCED AI ENDPOINTS (Sprint 23) ───────────────────────────────────────

// GET /api/v1/ai/leads/:id/churn-risk
aiRouter.get('/leads/:id/churn-risk', async (req, res) => {
  try {
    const result = await advancedAIService.getChurnRisk(req.params['id'], req.auth.tenantId);
    sendSuccess(res, result);
  } catch (error) {
    res.status(400).json({ error: { code: 'CHURN_RISK_ERROR', message: (error as Error).message } });
  }
});

// GET /api/v1/ai/leads/:id/routing-recommendation
aiRouter.get('/leads/:id/routing-recommendation', async (req, res) => {
  try {
    const result = await advancedAIService.getRoutingRecommendation(req.params['id'], req.auth.tenantId);
    sendSuccess(res, result);
  } catch (error) {
    res.status(400).json({ error: { code: 'ROUTING_ERROR', message: (error as Error).message } });
  }
});

// GET /api/v1/ai/leads/:id/best-contact-time
aiRouter.get('/leads/:id/best-contact-time', async (req, res) => {
  try {
    const result = await advancedAIService.getBestContactTime(req.params['id'], req.auth.tenantId);
    sendSuccess(res, result);
  } catch (error) {
    res.status(400).json({ error: { code: 'CONTACT_TIME_ERROR', message: (error as Error).message } });
  }
});
