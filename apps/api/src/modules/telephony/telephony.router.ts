import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';
import { getTelephonyProvider } from './providers';
import { getTenantFilter } from '../../shared/utils/tenant-filter';

export const telephonyRouter = Router();

telephonyRouter.use(requireAuth);

/**
 * @swagger
 * /telephony/provider:
 *   get:
 *     tags: [Telephony]
 *     summary: Get active telephony provider
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current provider name
 * /telephony/providers:
 *   get:
 *     tags: [Telephony]
 *     summary: List available telephony providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of provider options
 * /telephony/click-to-call:
 *   post:
 *     tags: [Telephony]
 *     summary: Initiate a click-to-call
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, leadId]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               leadId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call initiated
 * /telephony/calls:
 *   get:
 *     tags: [Telephony]
 *     summary: Get call history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Call records
 * /telephony/calls/{callId}/recording:
 *   get:
 *     tags: [Telephony]
 *     summary: Get call recording URL
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording URL
 * /telephony/webhook:
 *   post:
 *     tags: [Telephony]
 *     summary: Telephony provider webhook callback
 *     responses:
 *       200:
 *         description: Webhook processed
 */

// GET /api/v1/telephony/provider — which provider is active
telephonyRouter.get('/provider', (req, res) => {
  const provider = getTelephonyProvider();
  sendSuccess(res, { name: provider.name });
});

// GET /api/v1/telephony/numbers
telephonyRouter.get('/numbers', async (req, res) => {
  const tenantFilter = getTenantFilter(req.auth.tenantId, req.auth.role);
  const numbers = await prisma.phoneNumber.findMany({
    where: { ...tenantFilter, isActive: true },
    include: { _count: { select: { callLogs: true } } },
  });
  sendSuccess(res, numbers);
});

// GET /api/v1/telephony/numbers/available — list numbers available to provision
// Twilio: searches Twilio API  |  Exotel: lists pre-purchased but unassigned numbers
telephonyRouter.get('/numbers/available', async (req, res) => {
  const { areaCode } = req.query as { areaCode?: string };
  const provider = getTelephonyProvider();
  try {
    const numbers = await provider.searchAvailableNumbers({ areaCode });
    sendSuccess(res, numbers);
  } catch (err: any) {
    // If credentials aren't configured, return empty list with a warning
    if (err?.message?.includes('not configured')) {
      sendSuccess(res, [], { warning: err.message });
    } else {
      throw err;
    }
  }
});

// POST /api/v1/telephony/numbers/provision
telephonyRouter.post('/numbers/provision', async (req, res) => {
  const { number, providerSid, forwardTo } = z
    .object({
      number: z.string().min(7),        // the phone number to provision
      providerSid: z.string().optional(), // required for Exotel, ignored by Twilio
      forwardTo: z.string().min(7),     // number to forward calls to
    })
    .parse(req.body);

  const provider = getTelephonyProvider();

  const result = await provider.provisionNumber({
    number,
    providerSid,
    tenantId: req.auth.tenantId,
    forwardTo,
  });

  const phoneNumber = await prisma.phoneNumber.create({
    data: {
      tenantId: req.auth.tenantId,
      number: result.phoneNumber,
      provider: provider.name,
      providerSid: result.providerSid,
      forwardTo,
      isActive: true,
    },
  });

  sendSuccess(res, phoneNumber, undefined, 201);
});

// GET /api/v1/telephony/calls
telephonyRouter.get('/calls', async (req, res) => {
  const { from, to, page, limit } = req.query as Record<string, string>;
  const pageNum = parseInt(page ?? '1');
  const limitNum = Math.min(parseInt(limit ?? '50'), 100);

  const tenantFilter = getTenantFilter(req.auth.tenantId, req.auth.role);
  const where = {
    ...tenantFilter,
    ...(from || to
      ? {
          startedAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { startedAt: 'desc' },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
        phoneNumber: { select: { number: true } },
      },
    }),
    prisma.callLog.count({ where }),
  ]);

  sendSuccess(res, calls, { page: pageNum, limit: limitNum, total });
});

// GET /api/v1/telephony/calls/:id
telephonyRouter.get('/calls/:id', async (req, res) => {
  const tenantFilter = getTenantFilter(req.auth.tenantId, req.auth.role);
  const call = await prisma.callLog.findFirst({
    where: { id: req.params['id'], ...tenantFilter },
    include: { lead: true, phoneNumber: true },
  });
  if (!call) throw new NotFoundError('Call');
  sendSuccess(res, call);
});
