import { useCallback } from 'react';
import { Megaphone, Users, Phone, TrendingUp, CheckSquare, Clock, BarChart3, Target, DollarSign, Rocket, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { LeadRecommendationsWidget } from '../components/LeadRecommendationsWidget';
import { Badge } from '../components/Badge';
import { Link } from 'react-router-dom';
import { useMyTasks } from '../api/tasks';
import type { Task } from '../api/tasks';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useCampaignRecommendations, useSpendAnalytics, useLeadFlowAnalytics } from '../api/growth';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [campaigns, leads, calls] = await Promise.all([
        api.get('/campaigns').then((r) => r.data.data as any[]),
        api.get('/leads?limit=5').then((r) => r.data),
        api.get('/telephony/calls?limit=5').then((r) => r.data),
      ]);
      return { campaigns, leads, calls };
    },
  });
}

export function Dashboard() {
  const { data, isLoading } = useDashboard();
  const queryClient = useQueryClient();

  // Auto-refresh dashboard when workflow completes or notification arrives
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  useSocketEvent('workflow:execution', handleRefresh);
  useSocketEvent('notification:new', handleRefresh);

  const activeCampaigns = data?.campaigns?.filter((c: any) => c.status === 'active').length ?? 0;
  const totalLeads = data?.leads?.meta?.total ?? 0;
  const totalCalls = data?.calls?.meta?.total ?? 0;
  const recentLeads: any[] = data?.leads?.data ?? [];
  const recentCalls: any[] = data?.calls?.data ?? [];

  const sparkData = Array.from({ length: 7 }, (_, i) => ({
    day: `D${i + 1}`,
    leads: Math.floor(Math.random() * 20 + 5),
  }));

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-xl w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your lead generation performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active Campaigns" value={activeCampaigns} icon={Megaphone} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Total Leads" value={totalLeads} icon={Users} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Total Calls" value={totalCalls} icon={Phone} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Total Campaigns" value={data?.campaigns?.length ?? 0} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Leads — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#2563eb" fill="url(#leadGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Recent Leads</h2>
            <Link to="/leads" className="text-xs font-medium text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-10">No leads yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLeads.slice(0, 5).map((lead: any) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">{lead.phone ?? lead.email ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={lead.platform} />
                    {lead.qualityScore != null && (
                      <span className="text-xs text-gray-600">{lead.qualityScore}%</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Recent Calls</h2>
            <Link to="/telephony" className="text-xs font-medium text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-10">No calls yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentCalls.slice(0, 5).map((call: any) => (
                <div key={call.id} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{call.fromNumber ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-600 mt-0.5">→ {call.phoneNumber?.number ?? call.toNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={call.status} />
                    {call.durationSeconds != null && (
                      <span className="text-xs text-gray-600">{call.durationSeconds}s</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Campaigns</h2>
            <Link to="/campaigns" className="text-xs font-medium text-blue-600 hover:text-blue-700">Manage</Link>
          </div>
          {(data?.campaigns ?? []).length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-10">No campaigns yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.campaigns ?? []).slice(0, 5).map((c: any) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge label={c.platform} />
                    <Badge label={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Recommendations Widget */}
      <div className="mt-8">
        <LeadRecommendationsWidget />
      </div>

      {/* Growth Intelligence Widget */}
      <GrowthIntelligenceWidget />

      {/* My Tasks Widget */}
      <MyTasksWidget />

      {/* Bulk Scoring Link */}
      <div className="mt-6 flex justify-end">
        <Link
          to="/bulk-scoring"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <BarChart3 size={16} /> Bulk Score Leads
        </Link>
      </div>
    </div>
  );
}

function MyTasksWidget() {
  const { data: tasks, isLoading } = useMyTasks();

  return (
    <div className="bg-white rounded-2xl shadow-sm mt-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CheckSquare size={15} className="text-blue-600" />
          My Tasks
        </h2>
        <Link to="/tasks" className="text-xs font-medium text-blue-600 hover:text-blue-700">View all</Link>
      </div>
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto" />
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No active tasks</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {tasks.slice(0, 5).map((task: Task) => {
            const overdue = task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <div key={task.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge label={task.priority} />
                    <Badge label={task.status.replace('_', ' ')} />
                  </div>
                </div>
                {task.dueDate && (
                  <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    <Clock size={12} />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GrowthIntelligenceWidget() {
  const { data: recommendations } = useCampaignRecommendations();
  const { data: spendData } = useSpendAnalytics();
  const { data: flowData } = useLeadFlowAnalytics();

  const highPriorityRecs = recommendations?.filter(r => r.priority === 'high').length ?? 0;
  const totalRecs = recommendations?.length ?? 0;
  const wastedSpend = spendData?.reduce((s, p) => s + p.wastedSpend, 0) ?? 0;
  const velocityChange = flowData?.velocityChange ?? 0;
  const totalLeads30d = flowData?.totalLeads30d ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm mt-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp size={15} className="text-blue-600" />
          Growth Intelligence
        </h2>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Leads (30d)</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{totalLeads30d.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Velocity</p>
          <p className={`text-lg font-bold mt-0.5 ${velocityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {velocityChange >= 0 ? '+' : ''}{velocityChange}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Wasted Spend</p>
          <p className="text-lg font-bold text-red-600 mt-0.5">
            ${wastedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Recommendations</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {totalRecs}
            {highPriorityRecs > 0 && (
              <span className="ml-1.5 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                {highPriorityRecs} urgent
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Top recommendation */}
      {recommendations && recommendations.length > 0 && (
        <div className="px-6 pb-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900">{recommendations[0].title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{recommendations[0].description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 border-t border-gray-50">
        <Link
          to="/campaign-optimizer"
          className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50/80 transition-colors"
        >
          <Target size={13} /> Campaign Optimizer
        </Link>
        <Link
          to="/spend-optimizer"
          className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50/80 transition-colors border-x border-gray-50"
        >
          <DollarSign size={13} /> Spend Optimizer
        </Link>
        <Link
          to="/lead-flow"
          className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50/80 transition-colors"
        >
          <Rocket size={13} /> Lead Flow Booster
        </Link>
      </div>
    </div>
  );
}
