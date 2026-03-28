import { Router } from 'express';
import { z } from 'zod';
import { billingService } from './billing.service';
import { stripeService } from './stripe.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { sendSuccess } from '../../shared/utils/response';
import { prisma } from '../../shared/database/prisma';

export const billingRouter = Router();

billingRouter.use(requireAuth);

// GET /api/v1/billing/plans
// Get all available plans
billingRouter.get('/plans', async (req, res) => {
  const plans = billingService.getPlans();
  sendSuccess(res, plans);
});

// GET /api/v1/billing/subscription
// Get current subscription
billingRouter.get('/subscription', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access another tenant');
  }

  const subscription = await billingService.getSubscription(tenantId, req.auth.role);
  sendSuccess(res, subscription);
});

// POST /api/v1/billing/subscription
// Create subscription
billingRouter.post('/subscription', async (req, res) => {
  const schema = z.object({
    planId: z.string(),
    billing: z.enum(['monthly', 'annual']).optional().default('monthly'),
  });

  const data = schema.parse(req.body);

  try {
    const tenantId =
      req.auth.role === 'super_admin' && req.query['tenantId']
        ? String(req.query['tenantId'])
        : req.auth.tenantId;

    if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
      throw new Error('Forbidden: Cannot create subscription for another tenant');
    }

    const subscription = await billingService.createSubscription(
      tenantId,
      req.auth.role,
      data.planId,
      data.billing
    );
    sendSuccess(res, subscription);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PATCH /api/v1/billing/subscription/upgrade
// Upgrade/downgrade subscription
billingRouter.patch('/subscription/upgrade', async (req, res) => {
  const schema = z.object({
    planId: z.string(),
  });

  const data = schema.parse(req.body);

  try {
    const tenantId =
      req.auth.role === 'super_admin' && req.query['tenantId']
        ? String(req.query['tenantId'])
        : req.auth.tenantId;

    if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
      throw new Error('Forbidden: Cannot update subscription for another tenant');
    }

    const subscription = await billingService.updateSubscription(
      tenantId,
      req.auth.role,
      data.planId
    );
    sendSuccess(res, subscription);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// POST /api/v1/billing/subscription/cancel
// Cancel subscription
billingRouter.post('/subscription/cancel', async (req, res) => {
  const schema = z.object({
    immediately: z.boolean().optional().default(false),
  });

  const data = schema.parse(req.body);

  try {
    const tenantId =
      req.auth.role === 'super_admin' && req.query['tenantId']
        ? String(req.query['tenantId'])
        : req.auth.tenantId;

    if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
      throw new Error('Forbidden: Cannot cancel subscription for another tenant');
    }

    const subscription = await billingService.cancelSubscription(
      tenantId,
      req.auth.role,
      data.immediately
    );
    sendSuccess(res, subscription);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /api/v1/billing/usage
// Get usage metrics for tenant
billingRouter.get('/usage', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access usage for another tenant');
  }

  const usage = await billingService.getUsageMetrics(tenantId, req.auth.role);
  sendSuccess(res, usage);
});

// GET /api/v1/billing/can-create-campaign
// Check if tenant can create a campaign
billingRouter.get('/can-create-campaign', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access campaign creation check for another tenant');
  }

  const canCreate = await billingService.canCreateCampaign(tenantId, req.auth.role);
  sendSuccess(res, { canCreate });
});

// GET /api/v1/billing/can-store-lead
// Check if tenant can store a lead
billingRouter.get('/can-store-lead', async (req, res) => {
  const tenantId =
    req.auth.role === 'super_admin' && req.query['tenantId']
      ? String(req.query['tenantId'])
      : req.auth.tenantId;

  if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
    throw new Error('Forbidden: Cannot access lead storage check for another tenant');
  }

  const canStore = await billingService.canStoreLead(tenantId, req.auth.role);
  sendSuccess(res, { canStore });
});

// POST /api/v1/billing/checkout
// Create Stripe checkout session
billingRouter.post('/checkout', async (req, res) => {
  const schema = z.object({
    planId: z.string(),
    billing: z.enum(['monthly', 'annual']).default('monthly'),
  });

  try {
    const tenantId =
      req.auth.role === 'super_admin' && req.query['tenantId']
        ? String(req.query['tenantId'])
        : req.auth.tenantId;

    if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
      throw new Error('Forbidden: Cannot initiate checkout for another tenant');
    }

    const data = schema.parse(req.body);
    const plan = billingService.getPlan(data.planId);

    if (!plan) {
      return res.status(404).json({ error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } });
    }

    if (!stripeService.isEnabled()) {
      return res.status(400).json({
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
    });

    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    const planPrice = data.billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;

    const session = await stripeService.createCheckoutSession(
      tenantId,
      data.planId,
      planPrice,
      data.billing,
      user.email
    );

    sendSuccess(res, {
      sessionId: session.id,
      sessionUrl: session.url,
    });
  } catch (error) {
    res.status(400).json({ error: { code: 'CHECKOUT_ERROR', message: (error as Error).message } });
  }
});

// POST /api/v1/billing/portal
// Create Stripe customer portal session
billingRouter.post('/portal', async (req, res) => {
  try {
    if (!stripeService.isEnabled()) {
      return res.status(400).json({
        error: { code: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured' },
      });
    }

    const tenantId =
      req.auth.role === 'super_admin' && req.query['tenantId']
        ? String(req.query['tenantId'])
        : req.auth.tenantId;

    if (req.auth.role !== 'super_admin' && req.query['tenantId'] && String(req.query['tenantId']) !== req.auth.tenantId) {
      throw new Error('Forbidden: Cannot access portal for another tenant');
    }

    const subscription = await billingService.getSubscription(tenantId, req.auth.role);

    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' },
      });
    }

    const returnUrl = `${req.headers.origin || 'http://localhost:5173'}/billing`;
    const portalSession = await stripeService.createPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );

    sendSuccess(res, {
      sessionUrl: portalSession.url,
    });
  } catch (error) {
    res.status(400).json({ error: { code: 'PORTAL_ERROR', message: (error as Error).message } });
  }
});
