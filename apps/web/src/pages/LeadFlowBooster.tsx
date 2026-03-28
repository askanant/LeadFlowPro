import { Rocket, TrendingUp, TrendingDown, Activity, BarChart3, Globe } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { useLeadFlowAnalytics, useGrowthRecommendations } from '../api/growth';
import type { Recommendation } from '../api/growth';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const priorityStyles: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
};

const priorityBadge: Record<string, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-blue-50 text-blue-700',
};

const PLATFORM_COLORS: Record<string, string> = {
  meta: '#3b82f6',
  google: '#ef4444',
  linkedin: '#0ea5e9',
  microsoft: '#10b981',
  taboola: '#8b5cf6',
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${priorityStyles[rec.priority]} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${priorityBadge[rec.priority]}`}>
              {rec.priority}
            </span>
            <span className="text-xs text-gray-400">{rec.type}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{rec.title}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg">{rec.impact}</p>
        </div>
      </div>
    </div>
  );
}

export function LeadFlowBooster() {
  const { data: flowData, isLoading: loadingFlow } = useLeadFlowAnalytics();
  const { data: recommendations, isLoading: loadingRecs } = useGrowthRecommendations();

  const isLoading = loadingFlow || loadingRecs;

  const velocityIcon = (flowData?.velocityChange ?? 0) >= 0 ? TrendingUp : TrendingDown;
  const velocityColor = (flowData?.velocityChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600';
  const velocityBg = (flowData?.velocityChange ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50';

  const chartData = flowData?.dailyTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: d.count,
  })) ?? [];

  const highPriorityCount = recommendations?.filter((r) => r.priority === 'high').length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Flow Booster</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor lead velocity, discover untapped sources, and scale what works</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Leads (30d)"
          value={(flowData?.totalLeads30d ?? 0).toLocaleString()}
          icon={BarChart3}
        />
        <StatCard
          title="Daily Average"
          value={Math.round(flowData?.avgDailyVolume ?? 0).toLocaleString()}
          icon={Activity}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Velocity Change"
          value={`${(flowData?.velocityChange ?? 0) >= 0 ? '+' : ''}${flowData?.velocityChange ?? 0}%`}
          icon={velocityIcon}
          color={velocityColor}
          bg={velocityBg}
          subtitle="Week over week"
        />
        <StatCard
          title="Untapped Platforms"
          value={flowData?.unusedPlatforms.length ?? 0}
          icon={Globe}
          color="text-purple-600"
          bg="bg-purple-50"
          subtitle={flowData?.unusedPlatforms.length ? flowData.unusedPlatforms.join(', ') : 'All platforms in use'}
        />
      </div>

      {/* 30-Day Trend */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">30-Day Lead Trend</h2>
              {flowData?.peakDay && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Peak: {new Date(flowData.peakDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({flowData.peakDayCount} leads)
                </p>
              )}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#leadGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {flowData?.platformBreakdown && flowData.platformBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
          <div className="space-y-3">
            {flowData.platformBreakdown.map((p) => (
              <div key={p.platform} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold uppercase shrink-0"
                  style={{ backgroundColor: PLATFORM_COLORS[p.platform] ?? '#6b7280' }}
                >
                  {p.platform.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">{p.platform}</p>
                    <p className="text-sm text-gray-500">
                      {p.count} leads <span className="text-gray-400">({p.percentage}%)</span>
                    </p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${p.percentage}%`,
                        backgroundColor: PLATFORM_COLORS[p.platform] ?? '#6b7280',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Growth Recommendations
              {highPriorityCount > 0 && (
                <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {highPriorityCount} high priority
                </span>
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!flowData?.dailyTrend || flowData.dailyTrend.length === 0) && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Rocket size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No lead flow data yet</p>
          <p className="text-xs text-gray-500 mt-1">Start receiving leads to see your flow analytics and growth recommendations.</p>
        </div>
      )}
    </div>
  );
}

export default LeadFlowBooster;
