import Stripe from 'stripe';
import { config } from '../../config';
import { prisma } from '../../shared/database/prisma';
import { LoggerService } from '../../shared/services/logger.service';

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    if (config.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: '2026-02-25.clover',
      });
    }
  }

  isEnabled(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create a Stripe checkout session for plan purchase
   */
  async createCheckoutSession(
    tenantId: string,
    planId: string,
    planPrice: number,
    billing: 'monthly' | 'annual',
    userEmail: string
  ) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const company = await prisma.company.findUnique({
      where: { tenantId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    const existingSubscription = await prisma.subscription.findFirst({
      where: { tenantId },
    });

    if (existingSubscription?.stripeCustomerId) {
      customerId = existingSubscription.stripeCustomerId;
    } else {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: {
          tenantId,
          companyName: company.name,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `LeadFlow Pro ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              metadata: {
                planId,
                tenantId,
              },
            },
            unit_amount: planPrice * 100, // Convert to cents
            recurring: {
              interval: billing === 'annual' ? 'year' : 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${config.BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.BASE_URL}/billing`,
      metadata: {
        tenantId,
        planId,
      },
    });

    return session;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);

      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);

      case 'customer.subscription.deleted':
        return this.handleSubscriptionCancel(event.data.object as Stripe.Subscription);

      case 'invoice.payment_failed':
        return this.handlePaymentFailed(event.data.object as Stripe.Invoice);

      default:
        LoggerService.logInfo(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout
   */
  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    const planId = session.metadata?.planId;
    const stripeSubscriptionId = session.subscription as string;
    const stripeCustomerId = session.customer as string;

    if (!tenantId || !planId || !stripeSubscriptionId) {
      throw new Error('Missing required metadata in checkout session');
    }

    // Get the subscription details from Stripe
    const subscription = await this.stripe!.subscriptions.retrieve(stripeSubscriptionId) as any;

    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    // Update or create subscription in database
    await prisma.subscription.upsert({
      where: {
        tenantId,
      },
      create: {
        tenantId,
        plan: planId,
        status: subscription.status as any,
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        plan: planId,
        status: subscription.status as any,
        stripeSubscriptionId,
        stripeCustomerId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenantId;

    if (!tenantId) return;

    const periodStart = new Date((subscription as any).current_period_start * 1000);
    const periodEnd = new Date((subscription as any).current_period_end * 1000);

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: subscription.status as any,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCancel(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenantId;

    if (!tenantId) return;

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
      },
    });
  }

  /**
   * Handle payment failures
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const tenantId = invoice.metadata?.tenantId;

    if (!tenantId) return;

    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'past_due',
      },
    });
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(stripeCustomerId: string, returnUrl: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    return this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
  }

  /**
   * Retrieve subscription from Stripe
   */
  async retrieveSubscription(subscriptionId: string) {
    if (!this.stripe) {
      return null;
    }

    return this.stripe.subscriptions.retrieve(subscriptionId);
  }
}

export const stripeService = new StripeService();
