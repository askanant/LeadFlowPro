import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { downloadReport } from '../api/reports';
import { StatCard } from '../components/StatCard';
import { TrendingUp, Users, DollarSign, Target, Activity, Download, Trash2, AlertCircle } from 'lucide-react';
import { useSpendAnalytics } from '../api/growth';
import {
  Bar,
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

interface Campaign {
  id: string;
  name: string;
  dailyBudget?: number | null;
  status?: string;
}

interface Lead {
  campaignId?: string;
  status?: string;
  qualityScore?: number | null;
}

function useAdvancedAnalytics() {
  return useQuery({
    queryKey: ['advanced-analytics'],
    queryFn: async () => {
      const [campaignsRes, leadsRes] = await Promise.all([
        api.get('/campaigns').then((r) => r.data.data),
        api.get('/leads?limit=500').then((r) => r.data.data),
      ]);
      return { campaigns: campaignsRes, leads: leadsRes };
    },
  });
}

export function AdvancedReporting() {
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState(new Date());
  const [selectedCampaign, setSelectedCampaign] = useState('');

  const { data, isLoading } = useAdvancedAnalytics();

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const campaigns: Campaign[] = data?.campaigns ?? [];
  const leads: Lead[] = data?.leads ?? [];
  const filteredLeads = selectedCampaign
    ? leads.filter((l) => l.campaignId === selectedCampaign)
    : leads;

  const conversions = filteredLeads.filter((l) => l.status === 'qualified').length;
  const conversionRate = filteredLeads.length > 0 ? (conversions / filteredLeads.length) * 100 : 0;
  const avgQuality =
    filteredLeads.length > 0
      ? filteredLeads.reduce((sum, l) => sum + (l.qualityScore ?? 0), 0) / filteredLeads.length
      : 0;
  const totalSpend = campaigns
    .filter((c) => !selectedCampaign || c.id === selectedCampaign)
    .reduce((sum, c) => sum + (Number(c.dailyBudget ?? 0) * 30), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Advanced Reporting</h1>
        <div className="flex gap-2">
          <button
            onClick={() => downloadReport('growth-optimization', 'pdf', {
              ...(selectedCampaign ? { campaignId: selectedCampaign } : {}),
              dateFrom: dateFrom.toISOString(),
              dateTo: dateTo.toISOString(),
            })}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors"
          >
            <Download size={14} /> Growth Report
          </button>
          <button
            onClick={() => downloadReport('lead-scoring', 'pdf', {
              ...(selectedCampaign ? { campaignId: selectedCampaign } : {}),
              dateFrom: dateFrom.toISOString(),
              dateTo: dateTo.toISOString(),
            })}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Download size={14} /> Export PDF
          </button>
          <button
            onClick={() => downloadReport('leads', 'csv', {
              ...(selectedCampaign ? { campaignId: selectedCampaign } : {}),
              dateFrom: dateFrom.toISOString(),
              dateTo: dateTo.toISOString(),
            })}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-4 gap-4">
          <input type="date" value={dateFrom.toISOString().split('T')[0]} onChange={(e) => setDateFrom(new Date(e.target.value))} aria-label="Start date" className="px-3 py-2 border rounded-lg" />
          <input type="date" value={dateTo.toISOString().split('T')[0]} onChange={(e) => setDateTo(new Date(e.target.value))} aria-label="End date" className="px-3 py-2 border rounded-lg" />
          <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} aria-label="Campaign filter" className="px-3 py-2 border rounded-lg">
            <option value="">All Campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => { setDateFrom(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); setDateTo(new Date()); setSelectedCampaign(''); }} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg">Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-4">
        <StatCard title="Total Leads" value={filteredLeads.length} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Conversions" value={conversions} icon={Target} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Conv. Rate" value={`${conversionRate.toFixed(1)}%`} icon={Activity} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="ROI" value={`$${totalSpend.toFixed(0)}`} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Avg Quality" value={`${avgQuality.toFixed(0)}`} icon={DollarSign} color="text-pink-600" bg="bg-pink-50" />
      </div>

      <GrowthStatsRow />

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
          {campaigns && campaigns.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={campaigns.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                <Legend />
                <Bar dataKey="_count.leads" fill="#3b82f6" name="Total Leads" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-600">No data available</div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quality Distribution</h2>
          {leads && leads.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChartComponent>
                <Pie
                  data={[
                    { name: 'Excellent (80+)', value: leads.filter((l) => (l.qualityScore ?? 0) >= 80).length, fill: '#10b981' },
                    { name: 'Good (60-79)', value: leads.filter((l) => (l.qualityScore ?? 0) >= 60 && (l.qualityScore ?? 0) < 80).length, fill: '#3b82f6' },
                    { name: 'Fair (40-59)', value: leads.filter((l) => (l.qualityScore ?? 0) >= 40 && (l.qualityScore ?? 0) < 60).length, fill: '#f59e0b' },
                    { name: 'Poor (<40)', value: leads.filter((l) => (l.qualityScore ?? 0) < 40).length, fill: '#ef4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { fill: '#10b981' },
                    { fill: '#3b82f6' },
                    { fill: '#f59e0b' },
                    { fill: '#ef4444' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
              </PieChartComponent>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-600">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

function GrowthStatsRow() {
  const { data: spendData } = useSpendAnalytics();

  const totalWasted = spendData?.reduce((s, p) => s + p.wastedSpend, 0) ?? 0;
  const totalSpendAll = spendData?.reduce((s, p) => s + p.totalSpend, 0) ?? 0;
  const avgJunkRate = spendData && spendData.length > 0
    ? Math.round(spendData.reduce((s, p) => s + p.junkRate, 0) / spendData.length)
    : 0;
  const totalQualified = spendData?.reduce((s, p) => s + p.qualifiedLeads, 0) ?? 0;
  const cpql = totalQualified > 0 ? Math.round(totalSpendAll / totalQualified) : 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <StatCard title="Wasted Spend" value={`$${totalWasted.toFixed(0)}`} icon={Trash2} color="text-red-600" bg="bg-red-50" />
      <StatCard title="Junk Rate" value={`${avgJunkRate}%`} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" />
      <StatCard title="Cost/Qualified Lead" value={`$${cpql}`} icon={DollarSign} color="text-teal-600" bg="bg-teal-50" />
    </div>
  );
}
