import { Target, TrendingUp, ArrowUpRight, XCircle, BarChart3 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { useCampaignOptimizerData, useCampaignRecommendations } from '../api/growth';
import type { CampaignConversionData, Recommendation } from '../api/growth';

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

function CampaignRow({ campaign }: { campaign: CampaignConversionData }) {
  const qualityColor = campaign.avgQuality >= 70 ? 'text-green-600' : campaign.avgQuality >= 40 ? 'text-amber-600' : 'text-red-600';
  const junkColor = campaign.junkRate > 30 ? 'text-red-600' : campaign.junkRate > 15 ? 'text-amber-600' : 'text-gray-600';

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-3.5 px-4">
        <div>
          <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
          <Badge label={campaign.platform} />
        </div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <Badge label={campaign.status} />
      </td>
      <td className="py-3.5 px-4 text-right text-sm text-gray-900 font-medium">{campaign.totalLeads}</td>
      <td className="py-3.5 px-4 text-right">
        <span className="text-sm font-semibold text-green-700">{campaign.conversionRate}%</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className="text-sm font-medium text-gray-900">{campaign.qualificationRate}%</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className={`text-sm font-medium ${junkColor}`}>{campaign.junkRate}%</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className={`text-sm font-semibold ${qualityColor}`}>{campaign.avgQuality}</span>
      </td>
      <td className="py-3.5 px-4 text-right text-sm text-gray-700">{formatCurrency(campaign.costPerLead)}</td>
      <td className="py-3.5 px-4 text-right text-sm text-gray-700">{formatCurrency(campaign.costPerQualifiedLead)}</td>
      <td className="py-3.5 px-4 text-right text-sm text-gray-500">{campaign.clickToLeadRate}%</td>
    </tr>
  );
}

export function CampaignOptimizer() {
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaignOptimizerData();
  const { data: recommendations, isLoading: loadingRecs } = useCampaignRecommendations();

  const isLoading = loadingCampaigns || loadingRecs;

  const totals = campaigns?.reduce(
    (acc, c) => ({
      leads: acc.leads + c.totalLeads,
      converted: acc.converted + c.convertedLeads,
      qualified: acc.qualified + c.qualifiedLeads,
      junk: acc.junk + c.junkLeads,
      spend: acc.spend + c.totalSpend,
    }),
    { leads: 0, converted: 0, qualified: 0, junk: 0, spend: 0 }
  ) ?? { leads: 0, converted: 0, qualified: 0, junk: 0, spend: 0 };

  const avgConversion = totals.leads > 0 ? Math.round((totals.converted / totals.leads) * 100) : 0;
  const avgQualification = totals.leads > 0 ? Math.round((totals.qualified / totals.leads) * 100) : 0;
  const avgJunk = totals.leads > 0 ? Math.round((totals.junk / totals.leads) * 100) : 0;
  const avgCPL = totals.leads > 0 ? Math.round(totals.spend / totals.leads) : 0;

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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaign Optimizer</h1>
        <p className="text-sm text-gray-500 mt-1">Maximize conversion rates and minimize wasted spend across all campaigns</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Leads" value={totals.leads.toLocaleString()} icon={BarChart3} />
        <StatCard title="Avg Conversion" value={`${avgConversion}%`} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Avg Qualification" value={`${avgQualification}%`} icon={ArrowUpRight} color="text-teal-600" bg="bg-teal-50" />
        <StatCard title="Junk Rate" value={`${avgJunk}%`} icon={XCircle} color="text-red-600" bg="bg-red-50" />
        <StatCard title="Avg CPL" value={formatCurrency(avgCPL)} icon={Target} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Recommendations
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

      {/* Campaign Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Campaign Performance</h2>
          <p className="text-xs text-gray-500 mt-0.5">{campaigns?.length ?? 0} active and paused campaigns</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Campaign</th>
                <th className="py-3 px-4 text-center font-medium">Status</th>
                <th className="py-3 px-4 text-right font-medium">Leads</th>
                <th className="py-3 px-4 text-right font-medium">Conv %</th>
                <th className="py-3 px-4 text-right font-medium">Qual %</th>
                <th className="py-3 px-4 text-right font-medium">Junk %</th>
                <th className="py-3 px-4 text-right font-medium">Quality</th>
                <th className="py-3 px-4 text-right font-medium">CPL</th>
                <th className="py-3 px-4 text-right font-medium">CPQL</th>
                <th className="py-3 px-4 text-right font-medium">CTL %</th>
              </tr>
            </thead>
            <tbody>
              {campaigns && campaigns.length > 0 ? (
                campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-gray-400">
                    No campaign data available. Create campaigns and track leads to see optimization insights.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CampaignOptimizer;
