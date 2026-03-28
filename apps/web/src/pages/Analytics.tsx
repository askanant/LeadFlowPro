import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Zap, AlertCircle, BarChart3, Download, Target, DollarSign, Rocket, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { downloadReport } from '../api/reports';
import { useSpendAnalytics, useLeadFlowAnalytics, useCampaignRecommendations } from '../api/growth';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as PieChartComponent,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Link } from 'react-router-dom';

interface Campaign {
  id: string;
  name: string;
  status?: string;
  dailyBudget?: number | null;
  platform?: string;
}

interface Lead {
  campaignId?: string;
  status?: string;
  qualityScore?: number | null;
}

function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const [campaigns, metrics, leads] = await Promise.all([
        api.get('/campaigns').then((r) => r.data.data as any[]),
        api.get('/campaigns?status=active').then((r) => r.data.data as any[]),
        api.get('/leads?limit=100').then((r) => r.data.data as any[]),
      ]);
      return { campaigns, activeMetrics: metrics, leads };
    },
  });
}

export function Analytics() {
  const { data, isLoading } = useAnalytics();

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

  const campaigns: Campaign[] = data?.campaigns ?? [];
  const leads: Lead[] = data?.leads ?? [];

  // Calculate aggregate metrics
  const totalSpend = campaigns.reduce((sum, c) => sum + (Number(c.dailyBudget ?? 0) * 30), 0);
  const totalLeads = leads.length;
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const highQualityLeads = leads.filter((l) => (l.qualityScore ?? 0) >= 70).length;
  const qualityRate = totalLeads > 0 ? (highQualityLeads / totalLeads) * 100 : 0;

  // Platform performance breakdown
  const platformMetrics = campaigns.reduce((acc: any, c) => {
    const platform = c.platform || 'unknown';
    if (!acc[platform]) {
      acc[platform] = { platform, campaigns: 0, spend: 0, leads: 0 };
    }
    acc[platform].campaigns += 1;
    acc[platform].spend += Number(c.dailyBudget ?? 0) * 30;
    acc[platform].leads = leads.filter((l) => l.campaignId === c.id).length;
    return acc;
  }, {});

  const platformChartData = Object.values(platformMetrics).map((m: any) => ({
    ...m,
    cpl: m.leads > 0 ? (m.spend / m.leads).toFixed(2) : '—',
  }));

  // Lead quality distribution
  const qualityBuckets = {
    excellent: leads.filter((l) => (l.qualityScore ?? 0) >= 80).length,
    good: leads.filter((l) => (l.qualityScore ?? 0) >= 60 && (l.qualityScore ?? 0) < 80).length,
    fair: leads.filter((l) => (l.qualityScore ?? 0) >= 40 && (l.qualityScore ?? 0) < 60).length,
    poor: leads.filter((l) => (l.qualityScore ?? 0) < 40).length,
  };

  const qualityData = [
    { name: 'Excellent (80+)', value: qualityBuckets.excellent, color: '#10b981' },
    { name: 'Good (60-79)', value: qualityBuckets.good, color: '#3b82f6' },
    { name: 'Fair (40-59)', value: qualityBuckets.fair, color: '#f59e0b' },
    { name: 'Poor (<40)', value: qualityBuckets.poor, color: '#ef4444' },
  ];

  // Campaign performance comparison
  const campaignComparison = campaigns.slice(0, 8).map((c) => ({
    name: c.name.substring(0, 12),
    spend: Number(c.dailyBudget ?? 0) * 30,
    leads: leads.filter((l) => l.campaignId === c.id).length,
    cpl: leads.filter((l) => l.campaignId === c.id).length > 0
      ? (Number(c.dailyBudget ?? 0) * 30) / leads.filter((l) => l.campaignId === c.id).length
      : 0,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">ROI, performance trends, and lead quality insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadReport('campaign-performance', 'pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Download size={14} /> Export PDF
          </button>
          <button
            onClick={() => downloadReport('leads', 'csv')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Spend (30d)"
          value={`$${totalSpend.toFixed(0)}`}
          icon={TrendingUp}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <StatCard
          title="Total Leads"
          value={totalLeads}
          icon={BarChart3}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          title="Avg CPL"
          value={`$${avgCpl.toFixed(2)}`}
          icon={Zap}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          title="Quality Rate"
          value={`${qualityRate.toFixed(0)}%`}
          icon={AlertCircle}
          color="text-green-600"
          bg="bg-green-50"
        />
      </div>

      {/* Charts Row 1: Platform Performance + Quality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Platform Performance */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Platform Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="platform" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="spend" fill="#8b5cf6" name="Spend ($)" />
              <Bar yAxisId="right" dataKey="leads" fill="#3b82f6" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Quality Distribution */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Lead Quality Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChartComponent>
              <Pie
                data={qualityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
              />
            </PieChartComponent>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Campaign Spend vs Leads + CPL Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Campaign Performance (Composed) */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Campaign Spend vs Leads</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={campaignComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="spend" fill="#ec4899" name="Spend ($)" />
              <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#06b6d4" name="Leads" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* CPL by Campaign */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Cost Per Lead (CPL) Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={campaignComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                formatter={(value) => `$${(value as number).toFixed(2)}`}
              />
              <Line
                type="monotone"
                dataKey="cpl"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="CPL ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Campaigns Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Top Performing Campaigns</h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-10">No campaigns yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="text-left px-6 py-3 font-medium text-gray-500">Campaign</th>
                  <th scope="col" className="text-left px-6 py-3 font-medium text-gray-500">Platform</th>
                  <th scope="col" className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th scope="col" className="text-right px-6 py-3 font-medium text-gray-500">Budget (30d)</th>
                  <th scope="col" className="text-right px-6 py-3 font-medium text-gray-500">Leads</th>
                  <th scope="col" className="text-right px-6 py-3 font-medium text-gray-500">CPL</th>
                  <th scope="col" className="text-right px-6 py-3 font-medium text-gray-500">Quality %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.slice(0, 10).map((c) => {
                  const campaignLeads = leads.filter((l) => l.campaignId === c.id);
                  const cpl = campaignLeads.length > 0
                    ? (Number(c.dailyBudget ?? 0) * 30 / campaignLeads.length).toFixed(2)
                    : '—';
                  const quality = campaignLeads.length > 0
                    ? ((campaignLeads.filter((l) => (l.qualityScore ?? 0) >= 70).length / campaignLeads.length) * 100).toFixed(0)
                    : '—';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link to={`/campaigns/${c.id}`} className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge label={c.platform ?? 'Unknown'} />
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge label={c.status ?? 'Unknown'} />
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-600">
                        ${(Number(c.dailyBudget ?? 0) * 30).toFixed(0)}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-600">
                        {campaignLeads.length}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-600">
                        {typeof cpl === 'string' ? cpl : `$${cpl}`}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`text-sm font-medium ${
                          Number(quality) >= 70 ? 'text-green-600' :
                          Number(quality) >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {quality}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Growth Insights Section */}
      <GrowthInsightsSection />
    </div>
  );
}

function GrowthInsightsSection() {
  const { data: spendData } = useSpendAnalytics();
  const { data: flowData } = useLeadFlowAnalytics();
  const { data: recommendations } = useCampaignRecommendations();

  const totalWasted = spendData?.reduce((s, p) => s + p.wastedSpend, 0) ?? 0;
  const totalSpend = spendData?.reduce((s, p) => s + p.totalSpend, 0) ?? 0;
  const wastedPct = totalSpend > 0 ? Math.round((totalWasted / totalSpend) * 100) : 0;
  const avgJunkRate = spendData && spendData.length > 0
    ? Math.round(spendData.reduce((s, p) => s + p.junkRate, 0) / spendData.length)
    : 0;
  const velocityChange = flowData?.velocityChange ?? 0;
  const highPriority = recommendations?.filter(r => r.priority === 'high').length ?? 0;

  return (
    <div className="mt-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Growth Insights</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard title="Wasted Spend" value={`$${totalWasted.toFixed(0)}`} icon={Trash2} color="text-red-600" bg="bg-red-50" subtitle={`${wastedPct}% of total`} />
        <StatCard title="Avg Junk Rate" value={`${avgJunkRate}%`} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Lead Velocity" value={`${velocityChange >= 0 ? '+' : ''}${velocityChange}%`} icon={TrendingUp} color={velocityChange >= 0 ? 'text-green-600' : 'text-red-600'} bg={velocityChange >= 0 ? 'bg-green-50' : 'bg-red-50'} subtitle="Week over week" />
        <StatCard title="Action Items" value={highPriority} icon={Target} color="text-purple-600" bg="bg-purple-50" subtitle={`${recommendations?.length ?? 0} total recommendations`} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/campaign-optimizer" className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Campaign Optimizer</p>
              <p className="text-[11px] text-gray-500">Maximize conversion rates</p>
            </div>
          </div>
        </Link>
        <Link to="/spend-optimizer" className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Spend Optimizer</p>
              <p className="text-[11px] text-gray-500">Eliminate wasted budget</p>
            </div>
          </div>
        </Link>
        <Link to="/lead-flow" className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Rocket size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Lead Flow Booster</p>
              <p className="text-[11px] text-gray-500">Scale lead volume</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
