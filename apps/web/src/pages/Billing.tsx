import { useState, useEffect } from 'react';
import { Check, Zap, AlertCircle, Loader } from 'lucide-react';
import { api } from '../api/client';

interface BillingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  leadLimit?: number;
  campaignLimit?: number;
  teamMembers?: number;
}

interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  status: 'active' | 'past_due' | 'canceled' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageMetrics {
  subscription: { plan: string; status: string } | null;
  usage: {
    campaigns: { used: number; limit?: number; percentUsed: number };
    leads: { used: number; limit?: number; percentUsed: number };
    teamMembers: { used: number; limit?: number; percentUsed: number };
  };
}

export function Billing() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes, usageRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription'),
        api.get('/billing/usage'),
      ]);

      setPlans(plansRes.data.data || []);
      setSubscription(subRes.data.data || null);
      setUsage(usageRes.data.data || null);
    } catch (err) {
      setError((err as any).response?.data?.error?.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    try {
      setCheckoutLoading(true);
      const response = await api.post('/billing/checkout', {
        planId,
        billing,
      });

      if (response.data.data.sessionUrl) {
        window.location.href = response.data.data.sessionUrl;
      }
    } catch (err) {
      setError((err as any).response?.data?.error?.message || 'Failed to create checkout session');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await api.post('/billing/portal');
      if (response.data.data.sessionUrl) {
        window.location.href = response.data.data.sessionUrl;
      }
    } catch (err) {
      setError((err as any).response?.data?.error?.message || 'Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Plans</h1>
        <p className="text-gray-600">Manage your subscription and usage</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Current Subscription */}
      {subscription && (
        <div className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h2>
              <p className="text-gray-600 mb-4">
                {plans.find((p) => p.id === subscription.plan)?.name || subscription.plan}
              </p>
              <p className="text-sm text-gray-500">
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              {subscription.status !== 'active' && (
                <p className="text-sm text-orange-600 mt-2 font-medium">
                  Status: {subscription.status}
                </p>
              )}
            </div>
            <button
              onClick={handleManageSubscription}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
            >
              Manage Subscription
            </button>
          </div>
        </div>
      )}

      {/* Usage Metrics */}
      {usage && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: 'Campaigns', data: usage.usage.campaigns },
              { label: 'Leads', data: usage.usage.leads },
              { label: 'Team Members', data: usage.usage.teamMembers },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">{item.label}</p>
                <div className="flex items-end gap-2 mb-2">
                  <p className="text-2xl font-bold text-gray-900">{item.data.used}</p>
                  {item.data.limit && <p className="text-sm text-gray-500">/ {item.data.limit}</p>}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.data.percentUsed > 90
                        ? 'bg-red-500'
                        : item.data.percentUsed > 75
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(item.data.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Upgrade Your Plan</h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded font-medium text-sm ${
                billing === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-4 py-2 rounded font-medium text-sm ${
                billing === 'annual'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="text-xs text-green-600 ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const isCurrentPlan = subscription?.plan === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-xl border-2 transition-all ${
                  isCurrentPlan
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    ${price}
                    <span className="text-sm text-gray-600 font-normal">
                      /{billing === 'annual' ? 'year' : 'month'}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {billing === 'annual'
                      ? `$${(price / 12).toFixed(2)}/month billed annually`
                      : 'billed monthly'}
                  </p>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isCurrentPlan || checkoutLoading}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm mb-6 transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-200 text-gray-600 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : checkoutLoading ? 'Loading...' : 'Choose Plan'}
                  </button>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}

                    {plan.campaignLimit && (
                      <div className="flex items-start gap-3 pt-3 border-t border-gray-200">
                        <Zap size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          {plan.campaignLimit} campaigns included
                        </span>
                      </div>
                    )}
                    {plan.leadLimit && (
                      <div className="flex items-start gap-3">
                        <Zap size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          {plan.leadLimit.toLocaleString()} leads/month
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="p-6 bg-gray-50 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Common Questions</h2>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Can I upgrade or downgrade anytime?</h4>
            <p className="text-sm text-gray-600">
              Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take
              effect at the next billing cycle.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Is there a free trial?</h4>
            <p className="text-sm text-gray-600">
              Contact our sales team at sales@leadflow.io to discuss trial options for enterprise
              plans.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">What payment methods do you accept?</h4>
            <p className="text-sm text-gray-600">
              We accept all major credit cards (Visa, MasterCard, American Express) through Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
