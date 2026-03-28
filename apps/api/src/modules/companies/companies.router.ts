import { Router } from 'express';
import { z } from 'zod';
import { companiesService } from './companies.service';
import { aiService } from '../ai/ai.service';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

const companyBodySchema = z.object({
  name: z.string().min(2).max(200),
  industry: z.string().max(100).optional(),
  businessType: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  targetGeo: z.any().optional(),
  leadCriteria: z.any().optional(),
  pricingDetails: z.any().optional(),
  offerDetails: z.string().max(5000).optional(),
});

const credentialsSchema = z.object({
  platform: z.enum(['meta', 'google', 'linkedin', 'microsoft', 'taboola']),
  accountId: z.string().max(500).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  appId: z.string().max(500).optional(),
  appSecret: z.string().max(1000).optional(),
  extraConfig: z.any().optional(),
  tokenExpiresAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

// GET /api/v1/companies — super_admin only
companiesRouter.get('/', requireRole('super_admin'), async (req, res) => {
  const companies = await companiesService.list(req.auth.tenantId, req.auth.role);
  sendSuccess(res, companies);
});

// GET /api/v1/companies/:tenantId
companiesRouter.get('/:tenantId', async (req, res) => {
  const company = await companiesService.getById(
    req.params['tenantId'],
    req.auth.tenantId,
    req.auth.role
  );
  sendSuccess(res, company);
});

// POST /api/v1/companies — super_admin only
companiesRouter.post('/', requireRole('super_admin'), async (req, res) => {
  const data = companyBodySchema.parse(req.body);
  const company = await companiesService.create(req.auth.tenantId, req.auth.role, data);
  sendSuccess(res, company, undefined, 201);
});

// PATCH /api/v1/companies/:tenantId
companiesRouter.patch('/:tenantId', async (req, res) => {
  const data = companyBodySchema.partial().parse(req.body);
  const company = await companiesService.update(
    req.params['tenantId'],
    data,
    req.auth.tenantId,
    req.auth.role
  );
  sendSuccess(res, company);
});

// POST /api/v1/companies/:tenantId/credentials
companiesRouter.post('/:tenantId/credentials', async (req, res) => {
  const data = credentialsSchema.parse(req.body);
  const result = await companiesService.storeCredentials(
    req.params['tenantId'],
    req.auth.tenantId,
    req.auth.role,
    data
  );
  sendSuccess(res, { id: result.id, platform: result.platform, isValid: result.isValid }, undefined, 201);
});

// POST /api/v1/companies/:tenantId/admin-credentials
companiesRouter.post('/:tenantId/admin-credentials', async (req, res) => {
  const result = await companiesService.generateAdminCredentials(
    req.params['tenantId'],
    req.auth.tenantId,
    req.auth.role
  );
  sendSuccess(res, result, undefined, 201);
});

// GET /api/v1/companies/:tenantId/credentials
companiesRouter.get('/:tenantId/credentials', async (req, res) => {
  const credentials = await companiesService.getCredentials(
    req.params['tenantId'],
    req.auth.tenantId,
    req.auth.role
  );
  sendSuccess(res, credentials);
});

// POST /api/v1/companies/:tenantId/analyze — AI targeting analysis
companiesRouter.post('/:tenantId/analyze', async (req, res) => {
  const result = await aiService.analyzeCompany(
    req.params['tenantId'],
    req.auth.tenantId,
    req.auth.role
  );
  sendSuccess(res, result);
});
