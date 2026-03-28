import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';
import { getTenantFilter } from '../../shared/utils/tenant-filter';
import { stripeService } from './stripe.service';

export interface BillingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  leadLimit?: number;
  campaignLimit?: number;
  teamMembers?: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'paused';
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class BillingService {
  private plans: Record<string, BillingPlan> = {
    starter: {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 99,
      annualPrice: 990,
      features: ['Up to 5 campaigns', 'Basic analytics', 'Community support'],
      leadLimit: 1000,
      campaignLimit: 5,
      teamMembers: 2,
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 299,
      annualPrice: 2990,
      features: ['Up to 20 campaigns', 'Advanced analytics', 'Priority support', 'AI optimization'],
      leadLimit: 10000,
      campaignLimit: 20,
      teamMembers: 5,
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyPrice: 999,
      annualPrice: 9990,
      features: [
        'Unlimited campaigns',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
        'Custom billing',
      ],
      leadLimit: undefined,
      campaignLimit: undefined,
      teamMembers: undefined,
    },
  };

  /**
   * Get available billing plans
   */
  getPlans(): BillingPlan[] {
    return Object.values(this.plans);
  }

  /**
   * Get single plan
   */
  getPlan(planId: string): BillingPlan | null {
    return this.plans[planId] ?? null;
  }

  /**
   * Create subscription for tenant
   */
  async createSubscription(
    tenantId: string,
    role: string | undefined,
    planId: string,
    billing: 'monthly' | 'annual' = 'monthly'
  ): Promise<Subscription> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    // Check if subscription already exists
    const existing = await prisma.subscription.findFirst({
      where: { tenantId },
    });

    if (existing && existing.status !== 'canceled') {
      throw new Error('Active subscription already exists');
    }

    // Stripe integration is optional and would be implemented when stripe package is installed
    let stripeSubId: string | undefined;

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(
      periodEnd.getMonth() + (billing === 'annual' ? 12 : 1)
    );

    return prisma.subscription.create({
      data: {
        tenantId,
        plan: planId,
        status: 'active',
        stripeSubscriptionId: stripeSubId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    }) as unknown as Subscription;
  }

  /**
   * Get current subscription
   */
  async getSubscription(tenantId: string, role: string | undefined): Promise<Subscription | null> {
    const tenantFilter = getTenantFilter(tenantId, role);
    return prisma.subscription.findFirst({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' },
    }) as unknown as Subscription | null;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    tenantId: string,
    role: string | undefined,
    immediately = false
  ): Promise<Subscription> {
    const tenantFilter = getTenantFilter(tenantId, role);
    const subscription = await prisma.subscription.findFirst({
      where: tenantFilter,
    });

    if (!subscription) throw new NotFoundError('Subscription');

    // Stripe integration is optional and would cancel subscriptions when stripe package is installed
    // For now, we just update the local subscription record

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: immediately ? 'canceled' : 'active',
        cancelAtPeriodEnd: !immediately,
      },
    }) as unknown as Subscription;
  }

  /**
   * Upgrade/downgrade subscription
   */
  async updateSubscription(
    tenantId: string,
    role: string | undefined,
    newPlanId: string
  ): Promise<Subscription> {
    const tenantFilter = getTenantFilter(tenantId, role);
    const subscription = await prisma.subscription.findFirst({
      where: tenantFilter,
    });

    if (!subscription) throw new NotFoundError('Subscription');

    const newPlan = this.getPlan(newPlanId);
    if (!newPlan) throw new Error('Plan not found');

    await this.logPlanChange(subscription.id, subscription.plan, newPlanId, subscription.plan < newPlanId ? 'upgrade' : 'downgrade');

    return prisma.subscription.update({
      where: { id: subscription.id },
      data: { plan: newPlanId },
    }) as unknown as Subscription;
  }

  /**
   * Check if tenant can create campaigns
   */
  async canCreateCampaign(tenantId: string, role: string | undefined): Promise<boolean> {
    const subscription = await this.getSubscription(tenantId, role);
    if (!subscription || subscription.status !== 'active') return false;

    const plan = this.getPlan(subscription.plan);
    if (!plan || !plan.campaignLimit) return true; // Enterprise has unlimited

    const campaignCount = await prisma.campaign.count({
      where: { tenantId },
    });

    return campaignCount < plan.campaignLimit;
  }

  /**
   * Check if tenant can store leads (quota check)
   */
  async canStoreLead(tenantId: string, role: string | undefined): Promise<boolean> {
    const subscription = await this.getSubscription(tenantId, role);
    if (!subscription || subscription.status !== 'active') return false;

    const plan = this.getPlan(subscription.plan);
    if (!plan || !plan.leadLimit) return true; // Enterprise has unlimited

    const leadCount = await prisma.lead.count({
      where: { tenantId },
    });

    return leadCount < plan.leadLimit;
  }

  /**
   * Get usage metrics for tenant
   */
  async getUsageMetrics(tenantId: string, role: string | undefined) {
    const subscription = await this.getSubscription(tenantId, role);
    const plan = subscription ? this.getPlan(subscription.plan) : null;

    const [campaignCount, leadCount, teamCount] = await Promise.all([
      prisma.campaign.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId } }),
    ]);

    return {
      subscription: subscription ? { plan: subscription.plan, status: subscription.status } : null,
      usage: {
        campaigns: {
          used: campaignCount,
          limit: plan?.campaignLimit,
          percentUsed: plan?.campaignLimit ? (campaignCount / plan.campaignLimit) * 100 : 0,
        },
        leads: {
          used: leadCount,
          limit: plan?.leadLimit,
          percentUsed: plan?.leadLimit ? (leadCount / plan.leadLimit) * 100 : 0,
        },
        teamMembers: {
          used: teamCount,
          limit: plan?.teamMembers,
          percentUsed: plan?.teamMembers ? (teamCount / plan.teamMembers) * 100 : 0,
        },
      },
    };
  }
  /**
   * Log a plan change to the PlanChangeLog table
   */
  private async logPlanChange(subscriptionId: string, oldPlan: string, newPlan: string, reason: string) {
    await prisma.planChangeLog.create({
      data: {
        subscriptionId,
        oldPlan,
        newPlan,
        reason,
      },
    });
  }
}

export const billingService = new BillingService();
