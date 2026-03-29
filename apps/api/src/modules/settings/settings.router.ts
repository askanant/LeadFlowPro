import { Router } from 'express';
import { z } from 'zod';
import { prisma, Prisma } from '../../shared/database/prisma';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { EncryptionService } from '../../shared/services/encryption.service';

export const settingsRouter = Router();

// All routes require auth
settingsRouter.use(requireAuth);
/**
 * @swagger
 * /settings/company:
 *   get:
 *     tags: [Settings]
 *     summary: Get company profile settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company settings
 *   patch:
 *     tags: [Settings]
 *     summary: Update company profile settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               industry:
 *                 type: string
 *               targetGeo:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated
 * /settings/integrations:
 *   get:
 *     tags: [Settings]
 *     summary: Get integration settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration config
 *   put:
 *     tags: [Settings]
 *     summary: Update integration settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integrations updated
 */
// ─── Company Profile ──────────────────────────────────────────────────────────

const companyUpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  industry: z.string().max(100).optional().nullable(),
  businessType: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  targetGeo: z
    .object({
      country: z.string().optional(),
      states: z.array(z.string()).optional(),
      cities: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
  settings: z.record(z.unknown()).optional(),
});

// GET /api/v1/settings/company
settingsRouter.get('/company', async (req, res) => {
  // super_admin can target any tenant via ?tenantId=
  let tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;
  // Validate tenant ownership for non-super_admin
  if (req.auth.role !== 'super_admin' && req.auth.tenantId !== tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      industry: true,
      businessType: true,
      description: true,
      targetGeo: true,
      settings: true,
      status: true,
      createdAt: true,
    },
  });

  sendSuccess(res, company);
});


// PUT /api/v1/settings/company
settingsRouter.put('/company', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;
  // Validate tenant ownership for non-super_admin
  if (req.auth.role !== 'super_admin' && req.auth.tenantId !== tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const data = companyUpdateSchema.parse(req.body);

  // Deep-merge settings JSON so callers can patch individual keys
  let mergedSettings: Record<string, unknown> | undefined;
  if (data.settings !== undefined) {
    const current = await prisma.company.findUniqueOrThrow({
      where: { tenantId },
      select: { settings: true },
    });
    const existing = (current.settings as Record<string, unknown>) ?? {};
    mergedSettings = { ...existing, ...data.settings };
  }

  const updated = await prisma.company.update({
    where: { tenantId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.industry !== undefined && { industry: data.industry }),
      ...(data.businessType !== undefined && { businessType: data.businessType }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.targetGeo !== undefined && { targetGeo: data.targetGeo ?? Prisma.DbNull }),
      ...(mergedSettings !== undefined && { settings: mergedSettings as Prisma.InputJsonValue }),
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      industry: true,
      businessType: true,
      description: true,
      targetGeo: true,
      settings: true,
      status: true,
    },
  });

  sendSuccess(res, updated);
});

// ─── Integrations ─────────────────────────────────────────────────────────────

const integrationsUpdateSchema = z.object({
  // WhatsApp delivery
  whatsappDeliveryNumber: z.string().optional().nullable(),

  // Meta Ads credentials
  meta: z
    .object({
      accessToken: z.string().optional(),
      accountId: z.string().optional(),
      appId: z.string().optional(),
      appSecret: z.string().optional(),
    })
    .optional(),
});

// GET /api/v1/settings/integrations
settingsRouter.get('/integrations', async (req, res) => {
  let tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;
  // Validate tenant ownership for non-super_admin
  if (req.auth.role !== 'super_admin' && req.auth.tenantId !== tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const [company, metaCreds] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { tenantId },
      select: { settings: true },
    }),
    prisma.adPlatformCredential.findFirst({
      where: { tenantId, platform: 'meta' },
      select: {
        id: true,
        accountId: true,
        appId: true,
        isValid: true,
        tokenExpiresAt: true,
        encryptedCredentials: true,
      },
    }),
  ]);

  const settings = (company.settings as Record<string, unknown>) ?? {};

  sendSuccess(res, {
    whatsapp: {
      deliveryNumber: (settings['whatsappDeliveryNumber'] as string) ?? null,
      configured: Boolean(settings['whatsappDeliveryNumber']),
    },
    meta: metaCreds
      ? {
          connected: metaCreds.isValid,
          accountId: metaCreds.accountId ?? null,
          appId: metaCreds.appId ?? null,
          hasAccessToken: Boolean(metaCreds.encryptedCredentials),
          tokenExpiresAt: metaCreds.tokenExpiresAt ?? null,
        }
      : { connected: false, accountId: null, appId: null, hasAccessToken: false, tokenExpiresAt: null },
  });
});

// PUT /api/v1/settings/integrations
settingsRouter.put('/integrations', async (req, res) => {
  let tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;
  // Validate tenant ownership for non-super_admin
  if (req.auth.role !== 'super_admin' && req.auth.tenantId !== tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }
  const data = integrationsUpdateSchema.parse(req.body);

  // Update WhatsApp delivery number in company.settings (merge)
  if (data.whatsappDeliveryNumber !== undefined) {
    const company = await prisma.company.findUniqueOrThrow({
      where: { tenantId },
      select: { settings: true },
    });
    const existing = (company.settings as Record<string, unknown>) ?? {};
    await prisma.company.update({
      where: { tenantId },
      data: {
        settings: {
          ...existing,
          whatsappDeliveryNumber: data.whatsappDeliveryNumber,
        },
      },
    });
  }

  // Upsert Meta Ads credential
  if (data.meta) {
    const { accessToken, accountId, appId, appSecret } = data.meta;

    // Encrypt sensitive credentials before storage
    const sensitiveData: Record<string, string> = {};
    if (accessToken) sensitiveData.accessToken = accessToken;
    if (appSecret) sensitiveData.appSecret = appSecret;

    let encryptedFields: { encryptedCredentials: string; credentialsIV: string } | undefined;
    if (Object.keys(sensitiveData).length > 0) {
      // Merge with existing encrypted credentials if partial update
      const existing = await prisma.adPlatformCredential.findUnique({
        where: { tenantId_platform: { tenantId, platform: 'meta' } },
        select: { encryptedCredentials: true, credentialsIV: true },
      });

      let merged = { ...sensitiveData };
      if (existing?.encryptedCredentials && existing.credentialsIV) {
        const decrypted = await EncryptionService.decryptObject<Record<string, string>>(
          existing.encryptedCredentials,
          existing.credentialsIV
        );
        merged = { ...decrypted, ...sensitiveData };
      }

      const { encrypted, iv } = await EncryptionService.encryptObject(merged);
      encryptedFields = { encryptedCredentials: encrypted, credentialsIV: iv };
    }

    await prisma.adPlatformCredential.upsert({
      where: { tenantId_platform: { tenantId, platform: 'meta' } },
      create: {
        tenantId,
        platform: 'meta',
        ...(accountId && { accountId }),
        ...(appId && { appId }),
        ...(encryptedFields ?? {}),
        isValid: true,
      },
      update: {
        ...(accountId !== undefined && { accountId }),
        ...(appId !== undefined && { appId }),
        ...(encryptedFields ?? {}),
        isValid: true,
      },
    });
  }

  // Return fresh integrations state
  const [company, metaCreds] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { tenantId },
      select: { settings: true },
    }),
    prisma.adPlatformCredential.findFirst({
      where: { tenantId, platform: 'meta' },
      select: { accountId: true, appId: true, isValid: true, tokenExpiresAt: true, encryptedCredentials: true },
    }),
  ]);

  const settings = (company.settings as Record<string, unknown>) ?? {};

  sendSuccess(res, {
    whatsapp: {
      deliveryNumber: (settings['whatsappDeliveryNumber'] as string) ?? null,
      configured: Boolean(settings['whatsappDeliveryNumber']),
    },
    meta: metaCreds
      ? {
          connected: metaCreds.isValid,
          accountId: metaCreds.accountId ?? null,
          appId: metaCreds.appId ?? null,
          hasAccessToken: Boolean(metaCreds.encryptedCredentials),
          tokenExpiresAt: metaCreds.tokenExpiresAt ?? null,
        }
      : { connected: false, accountId: null, appId: null, hasAccessToken: false, tokenExpiresAt: null },
  });
});
