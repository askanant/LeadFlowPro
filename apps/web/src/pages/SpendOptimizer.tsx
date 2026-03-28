import { DollarSign, TrendingDown, ArrowUpRight, Trash2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { useSpendAnalytics, useBudgetRecommendations } from '../api/growth';
import type { PlatformSpendData, Recommendation } from '../api/growth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

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

function PlatformCard({ platform }: { platform: PlatformSpendData }) {

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold uppercase"
            style={{ backgroundColor: PLATFORM_COLORS[platform.platform] ?? '#6b7280' }}
          >
            {platform.platform.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 capitalize">{platform.platform}</p>
            <p className="text-[10px] text-gray-500">{platform.activeCampaigns} active campaigns</p>
          </div>
        </div>
        <Badge label={platform.junkRate > 30 ? 'high junk' : platform.junkRate > 15 ? 'moderate' : 'healthy'} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Total Spend</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(platform.totalSpend)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Cost/Lead</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(platform.costPerLead)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Cost/Qualified</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(platform.costPerQualifiedLead)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Wasted Spend</p>
          <p className="text-lg font-bold text-red-600 mt-0.5">{formatCurrency(platform.wastedSpend)}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-xs font-semibold text-gray-900">{platform.totalLeads}</p>
          <p className="text-[10px] text-gray-400">Leads</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-green-600">{platform.qualifiedLeads}</p>
          <p className="text-[10px] text-gray-400">Qualified</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-600">{platform.convertedLeads}</p>
          <p className="text-[10px] text-gray-400">Converted</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-600">{platform.junkLeads}</p>
          <p className="text-[10px] text-gray-400">Junk</p>
        </div>
      </div>
    </div>
  );
}

export function SpendOptimizer() {
  const { data: platforms, isLoading: loadingSpend } = useSpendAnalytics();
  const { data: recommendations, isLoading: loadingRecs } = useBudgetRecommendations();

  const isLoading = loadingSpend || loadingRecs;

  const totalSpend = platforms?.reduce((s, p) => s + p.totalSpend, 0) ?? 0;
  const totalWasted = platforms?.reduce((s, p) => s + p.wastedSpend, 0) ?? 0;
  const wastedPct = totalSpend > 0 ? Math.round((totalWasted / totalSpend) * 100) : 0;
  const totalLeads = platforms?.reduce((s, p) => s + p.totalLeads, 0) ?? 0;
  const totalQualified = platforms?.reduce((s, p) => s + p.qualifiedLeads, 0) ?? 0;
  const overallCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

  const chartData = platforms?.map((p) => ({
    name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    platform: p.platform,
    spend: Math.round(p.totalSpend),
    wasted: Math.round(p.wastedSpend),
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Spend Optimizer</h1>
        <p className="text-sm text-gray-500 mt-1">Analyze spend efficiency across platforms and eliminate waste</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Spend (30d)" value={formatCurrency(totalSpend)} icon={DollarSign} />
        <StatCard title="Wasted Spend" value={formatCurrency(totalWasted)} icon={Trash2} color="text-red-600" bg="bg-red-50" subtitle={`${wastedPct}% of total spend`} />
        <StatCard title="Avg CPL" value={formatCurrency(overallCPL)} icon={TrendingDown} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Qualified Leads" value={totalQualified.toLocaleString()} icon={ArrowUpRight} color="text-green-600" bg="bg-green-50" subtitle={`of ${totalLeads.toLocaleString()} total`} />
      </div>

      {/* Spend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Spend vs Waste by Platform</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Bar dataKey="spend" name="Total Spend" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? '#6b7280'} />
                  ))}
                </Bar>
                <Bar dataKey="wasted" name="Wasted" fill="#fca5a5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Budget Recommendations
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

      {/* Platform Cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Platform Breakdown</h2>
        {platforms && platforms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {platforms.map((p) => (
              <PlatformCard key={p.platform} platform={p} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-sm text-gray-400">No spend data available. Start campaigns to see spend analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpendOptimizer;
