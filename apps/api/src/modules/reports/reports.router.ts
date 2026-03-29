import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { reportGeneratorService } from './report-generator.service';
import { scheduledReportService } from './scheduled-report.service';
import { z } from 'zod';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
/**
 * @swagger
 * /reports/campaign-performance/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Generate campaign performance PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 * /reports/leads/csv:
 *   get:
 *     tags: [Reports]
 *     summary: Export leads as CSV
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 * /reports/scheduled:
 *   get:
 *     tags: [Reports]
 *     summary: List scheduled reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of scheduled reports
 *   post:
 *     tags: [Reports]
 *     summary: Create scheduled report
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, reportType, schedule, recipients]
 *             properties:
 *               name:
 *                 type: string
 *               reportType:
 *                 type: string
 *               schedule:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Scheduled report created
 * /reports/saved:
 *   get:
 *     tags: [Reports]
 *     summary: List saved custom reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved reports
 *   post:
 *     tags: [Reports]
 *     summary: Create saved custom report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Custom report saved
 */
// ─── PDF Export Endpoints ─────────────────────────────────────────────────────

const filtersSchema = z.object({
  campaignId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
}).optional();

// GET /api/v1/reports/campaign-performance/pdf
reportsRouter.get('/campaign-performance/pdf', async (req, res) => {
  const { tenantId } = req.auth;
  const filters = filtersSchema.parse(req.query) ?? {};
  const pdf = await reportGeneratorService.generateCampaignPerformancePDF(tenantId, filters);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="campaign-performance.pdf"');
  res.send(pdf);
});

// GET /api/v1/reports/lead-scoring/pdf
reportsRouter.get('/lead-scoring/pdf', async (req, res) => {
  const { tenantId } = req.auth;
  const filters = filtersSchema.parse(req.query) ?? {};
  const pdf = await reportGeneratorService.generateLeadScoringPDF(tenantId, filters);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="lead-scoring.pdf"');
  res.send(pdf);
});

// GET /api/v1/reports/workflow-summary/pdf
reportsRouter.get('/workflow-summary/pdf', async (req, res) => {
  const { tenantId } = req.auth;
  const filters = filtersSchema.parse(req.query) ?? {};
  const pdf = await reportGeneratorService.generateWorkflowSummaryPDF(tenantId, filters);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="workflow-summary.pdf"');
  res.send(pdf);
});

// GET /api/v1/reports/growth-optimization/pdf
reportsRouter.get('/growth-optimization/pdf', async (req, res) => {
  const { tenantId } = req.auth;
  const filters = filtersSchema.parse(req.query) ?? {};
  const pdf = await reportGeneratorService.generateGrowthOptimizationPDF(tenantId, filters);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="growth-optimization.pdf"');
  res.send(pdf);
});

// GET /api/v1/reports/leads/csv
reportsRouter.get('/leads/csv', async (req, res) => {
  const { tenantId } = req.auth;
  const filters = filtersSchema.parse(req.query) ?? {};
  const csv = await reportGeneratorService.generateLeadsCSV(tenantId, filters);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"');
  res.send(csv);
});

// ─── Scheduled Reports CRUD ──────────────────────────────────────────────────

const scheduledReportSchema = z.object({
  name: z.string().min(1).max(255),
  reportType: z.enum(['campaign_performance', 'lead_scoring', 'workflow_summary', 'growth_optimization']),
  schedule: z.string().min(1), // cron expression
  recipients: z.array(z.string().email()).min(1),
  filters: z.record(z.unknown()).optional(),
});

// GET /api/v1/reports/scheduled
reportsRouter.get('/scheduled', async (req, res) => {
  const { tenantId } = req.auth;
  const reports = await scheduledReportService.list(tenantId);
  sendSuccess(res, reports);
});

// GET /api/v1/reports/scheduled/:id
reportsRouter.get('/scheduled/:id', async (req, res) => {
  const { tenantId } = req.auth;
  const report = await scheduledReportService.getById(req.params['id']!, tenantId);
  if (!report) return res.status(404).json({ error: 'Not found' });
  sendSuccess(res, report);
});

// POST /api/v1/reports/scheduled
reportsRouter.post('/scheduled', async (req, res) => {
  const { tenantId, userId } = req.auth;
  const body = scheduledReportSchema.parse(req.body);
  const report = await scheduledReportService.create({
    tenantId,
    ...body,
    createdBy: userId,
  });
  sendSuccess(res, report, undefined, 201);
});

// PATCH /api/v1/reports/scheduled/:id
reportsRouter.patch('/scheduled/:id', async (req, res) => {
  const { tenantId } = req.auth;
  const body = scheduledReportSchema.partial().parse(req.body);
  const report = await scheduledReportService.update(req.params['id']!, tenantId, body);
  sendSuccess(res, report);
});

// DELETE /api/v1/reports/scheduled/:id
reportsRouter.delete('/scheduled/:id', async (req, res) => {
  const { tenantId } = req.auth;
  await scheduledReportService.remove(req.params['id']!, tenantId);
  sendSuccess(res, { deleted: true });
});

// ─── Saved Reports (Custom Report Builder) ────────────────────────────────────

const savedReportSchema = z.object({
  name: z.string().min(1).max(255),
  config: z.object({
    metrics: z.array(z.string()),
    dimensions: z.array(z.string()),
    chartType: z.string(),
    filters: z.record(z.unknown()).optional(),
    dateRange: z.object({
      from: z.string(),
      to: z.string(),
    }).optional(),
  }),
  isPublic: z.boolean().optional(),
});

// GET /api/v1/reports/saved
reportsRouter.get('/saved', async (req, res) => {
  const { tenantId } = req.auth;
  const reports = await scheduledReportService.listSaved(tenantId);
  sendSuccess(res, reports);
});

// GET /api/v1/reports/saved/:id
reportsRouter.get('/saved/:id', async (req, res) => {
  const { tenantId } = req.auth;
  const report = await scheduledReportService.getSavedById(req.params['id']!, tenantId);
  if (!report) return res.status(404).json({ error: 'Not found' });
  sendSuccess(res, report);
});

// POST /api/v1/reports/saved
reportsRouter.post('/saved', async (req, res) => {
  const { tenantId, userId } = req.auth;
  const body = savedReportSchema.parse(req.body);
  const report = await scheduledReportService.createSaved({
    tenantId,
    ...body,
    createdBy: userId,
  });
  sendSuccess(res, report, undefined, 201);
});

// PATCH /api/v1/reports/saved/:id
reportsRouter.patch('/saved/:id', async (req, res) => {
  const { tenantId } = req.auth;
  const body = savedReportSchema.partial().parse(req.body);
  const report = await scheduledReportService.updateSaved(req.params['id']!, tenantId, body);
  sendSuccess(res, report);
});

// DELETE /api/v1/reports/saved/:id
reportsRouter.delete('/saved/:id', async (req, res) => {
  const { tenantId } = req.auth;
  await scheduledReportService.removeSaved(req.params['id']!, tenantId);
  sendSuccess(res, { deleted: true });
});
