import { Router } from 'express';
import { z } from 'zod';
import { leadsService } from './leads.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';

export const leadsRouter = Router();

leadsRouter.use(requireAuth);

/**
 * @swagger
 * /leads:
 *   get:
 *     tags: [Leads]
 *     summary: List leads with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, contacted, qualified, converted, lost, duplicate] }
 *       - in: query
 *         name: campaignId
 *         schema: { type: string }
 *       - in: query
 *         name: platform
 *         schema: { type: string }
 *       - in: query
 *         name: quality
 *         schema: { type: string, enum: [excellent, good, fair, poor] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated lead list
 */
leadsRouter.get('/', async (req, res) => {
  const { status, campaignId, platform, quality, from, to, page, limit } = req.query as Record<
    string,
    string
  >;
  const result = await leadsService.list(req.auth.tenantId, req.auth.role, {
    status,
    campaignId,
    platform,
    quality: quality as 'excellent' | 'good' | 'fair' | 'poor' | undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
  });
  sendSuccess(res, result.leads, result.meta);
});

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     tags: [Leads]
 *     summary: Get a single lead by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lead details
 *       404:
 *         description: Lead not found
 */
leadsRouter.get('/:id', async (req, res) => {
  const lead = await leadsService.getById(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, lead);
});

// GET /api/v1/leads/:id/audit
leadsRouter.get('/:id/audit', async (req, res) => {
  const audit = await leadsService.getAuditTrail(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, audit);
});

// GET /api/v1/leads/:id/calls
leadsRouter.get('/:id/calls', async (req, res) => {
  const calls = await leadsService.getCalls(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, calls);
});

// POST /api/v1/leads/:id/notes
leadsRouter.post('/:id/notes', async (req, res) => {
  const { content } = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);
  const note = await leadsService.addNote(req.params['id'], req.auth.tenantId, req.auth.role, content);
  sendSuccess(res, note);
});

// GET /api/v1/leads/:id/notes
leadsRouter.get('/:id/notes', async (req, res) => {
  const notes = await leadsService.getNotes(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, notes);
});

// PATCH /api/v1/leads/:id/status
leadsRouter.patch('/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.string().min(1).max(50) }).parse(req.body);
  const lead = await leadsService.updateStatus(req.params['id'], req.auth.tenantId, req.auth.role, status);
  sendSuccess(res, lead);
});

// GET /api/v1/leads/:id/quality
// Get quality score breakdown for a lead
leadsRouter.get('/:id/quality', async (req, res) => {
  const breakdown = await leadsService.getQualityBreakdown(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, breakdown);
});

// POST /api/v1/leads/:id/recalculate-quality
// Recalculate quality score for a lead
leadsRouter.post('/:id/recalculate-quality', async (req, res) => {
  const score = await leadsService.recalculateQualityScore(req.params['id'], req.auth.tenantId, req.auth.role);
  sendSuccess(res, { qualityScore: score });
});

// GET /api/v1/leads/quality/distribution
// Get quality distribution for tenant
leadsRouter.get('/quality/distribution', async (req, res) => {
  const distribution = await leadsService.getQualityDistribution(req.auth.tenantId, req.auth.role);
  sendSuccess(res, distribution);
});

// GET /api/v1/leads/:id/duplicates
// Find potential duplicates for a lead
leadsRouter.get('/:id/duplicates', async (req, res) => {
  const duplicates = await leadsService.findDuplicates(req.auth.tenantId, req.params['id'], req.auth.role);
  sendSuccess(res, duplicates);
});

// GET /api/v1/leads/duplicates/stats
// Get duplicate statistics
leadsRouter.get('/duplicates/stats', async (req, res) => {
  const stats = await leadsService.getDuplicateStats(req.auth.tenantId, req.auth.role);
  sendSuccess(res, stats);
});

// POST /api/v1/leads/:id/merge-duplicate
// Merge a duplicate lead into primary
leadsRouter.post('/:id/merge-duplicate', async (req, res) => {
  const { duplicateLeadId } = z.object({ duplicateLeadId: z.string() }).parse(req.body);
  const primaryLeadId = await leadsService.mergeDuplicates(
    req.auth.tenantId,
    req.params['id'],
    duplicateLeadId,
    req.auth.role
  );
  sendSuccess(res, { mergedLeadId: primaryLeadId });
});

// POST /api/v1/leads/duplicates/auto-merge
// Auto-merge all duplicates
leadsRouter.post('/duplicates/auto-merge', async (req, res) => {
  const mergedCount = await leadsService.autoMergeDuplicates(req.auth.tenantId, req.auth.role);
  sendSuccess(res, { mergedCount });
});
