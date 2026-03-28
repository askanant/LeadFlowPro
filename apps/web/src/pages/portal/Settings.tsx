import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Users, Lock, LogOut, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

function useBillingData() {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await api.get('/billing/subscription');
      return res.data.data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get('/billing/plans');
      return res.data.data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const res = await api.get('/billing/usage');
      return res.data.data;
    },
  });

  return { subscription, plans, usage };
}

export function PortalSettings() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { subscription, plans, usage } = useBillingData();
  const [selectedTab, setSelectedTab] = useState<'billing' | 'team' | 'security'>('billing');

  const currentPlan = plans?.find((p: any) => p.id === subscription?.plan);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your subscription, team, and account</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 mb-8" role="tablist">
        <button
          role="tab"
          aria-selected={selectedTab === 'billing'}
          onClick={() => setSelectedTab('billing')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            selectedTab === 'billing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <CreditCard className="inline mr-2" size={16} />
          Billing
        </button>
        <button
          role="tab"
          aria-selected={selectedTab === 'team'}
          onClick={() => setSelectedTab('team')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            selectedTab === 'team'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="inline mr-2" size={16} />
          Team
        </button>
        <button
          role="tab"
          aria-selected={selectedTab === 'security'}
          onClick={() => setSelectedTab('security')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            selectedTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="inline mr-2" size={16} />
          Security
        </button>
      </div>

      {/* Billing Tab */}
      {selectedTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
            {subscription ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{currentPlan?.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    ${currentPlan?.monthlyPrice}/month
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Upgrade Plan
                </button>
              </div>
            ) : (
              <p className="text-gray-600">No active subscription. Choose a plan to get started.</p>
            )}
          </div>

          {/* Usage Metrics */}
          {usage && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage & Limits</h2>
              <div className="space-y-4">
                {/* Campaigns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Campaigns</span>
                    <span className="text-sm text-gray-500">
                      {usage.usage.campaigns.used}
                      {usage.usage.campaigns.limit ? `/${usage.usage.campaigns.limit}` : '/∞'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, usage.usage.campaigns.percentUsed)}%` }}
                    />
                  </div>
                </div>

                {/* Leads */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Leads</span>
                    <span className="text-sm text-gray-500">
                      {usage.usage.leads.used}
                      {usage.usage.leads.limit ? `/${usage.usage.leads.limit}` : '/∞'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        usage.usage.leads.percentUsed > 80 ? 'bg-red-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(100, usage.usage.leads.percentUsed)}%` }}
                    />
                  </div>
                </div>

                {/* Team Members */}
                {usage.usage.teamMembers.limit && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Team Members</span>
                      <span className="text-sm text-gray-500">
                        {usage.usage.teamMembers.used}/{usage.usage.teamMembers.limit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, usage.usage.teamMembers.percentUsed)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Plans */}
          {plans && !subscription && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose a Plan</h2>
              <div className="grid grid-cols-3 gap-4">
                {plans.map((plan: any) => (
                  <div
                    key={plan.id}
                    className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <p className="text-lg font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      ${plan.monthlyPrice}
                      <span className="text-sm text-gray-500">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" /> {feature}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Choose Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {selectedTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{user?.email}</p>
                <p className="text-sm text-gray-500">Account Owner</p>
              </div>
            </div>
            <button className="mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Invite Team Member
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {selectedTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Password</h2>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Change Password
            </button>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                <p className="text-sm text-red-700 mt-1">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
