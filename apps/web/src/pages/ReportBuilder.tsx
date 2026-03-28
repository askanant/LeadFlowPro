import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Trash2, FolderOpen, Plus, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  PieChart as PieChartComponent, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';
import {
  useSavedReports, useCreateSavedReport, useUpdateSavedReport, useDeleteSavedReport,
  type ReportConfig, type SavedReport,
} from '../api/reports';

const AVAILABLE_METRICS = [
  { key: 'leads', label: 'Total Leads' },
  { key: 'spend', label: 'Total Spend' },
  { key: 'cpl', label: 'Cost per Lead' },
  { key: 'qualityScore', label: 'Avg Quality Score' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'conversionRate', label: 'Conversion Rate' },
  { key: 'junkRate', label: 'Junk Rate' },
  { key: 'wastedSpend', label: 'Wasted Spend' },
  { key: 'costPerQualifiedLead', label: 'Cost per Qualified Lead' },
];

const AVAILABLE_DIMENSIONS = [
  { key: 'campaign', label: 'By Campaign' },
  { key: 'platform', label: 'By Platform' },
  { key: 'status', label: 'By Status' },
];

const CHART_TYPES = [
  { key: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { key: 'line', label: 'Line Chart', icon: TrendingUp },
  { key: 'pie', label: 'Pie Chart', icon: PieChart },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function ReportBuilder() {
  const { data: savedReports } = useSavedReports();
  const createSaved = useCreateSavedReport();
  const updateSaved = useUpdateSavedReport();
  const deleteSaved = useDeleteSavedReport();

  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['leads', 'spend']);
  const [selectedDimension, setSelectedDimension] = useState('campaign');
  const [chartType, setChartType] = useState('bar');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]!);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  // Fetch data for chart preview
  const { data: rawData } = useQuery({
    queryKey: ['report-builder-data'],
    queryFn: async () => {
      const [campaigns, leads] = await Promise.all([
        api.get('/campaigns').then(r => r.data.data as any[]),
        api.get('/leads?limit=500').then(r => r.data.data as any[]),
      ]);
      return { campaigns, leads };
    },
  });

  // Build chart data based on dimension
  const chartData = (() => {
    if (!rawData) return [];
    const { campaigns, leads } = rawData;

    if (selectedDimension === 'campaign') {
      return campaigns.slice(0, 10).map((c: any) => {
        const cLeads = leads.filter((l: any) => l.campaignId === c.id);
        const junkLeads = cLeads.filter((l: any) => l.status === 'junk' || (l.qualityScore != null && l.qualityScore < 30));
        const qualifiedLeads = cLeads.filter((l: any) => l.status === 'qualified');
        const spendVal = Number(c.dailyBudget ?? 0) * 30;
        return {
          name: (c.name ?? '').substring(0, 15),
          leads: cLeads.length,
          spend: spendVal,
          cpl: cLeads.length > 0 ? Number((spendVal / cLeads.length).toFixed(2)) : 0,
          qualityScore: cLeads.length > 0 ? Number((cLeads.reduce((s: number, l: any) => s + (l.qualityScore ?? 0), 0) / cLeads.length).toFixed(1)) : 0,
          conversions: qualifiedLeads.length,
          conversionRate: cLeads.length > 0 ? Number(((qualifiedLeads.length / cLeads.length) * 100).toFixed(1)) : 0,
          junkRate: cLeads.length > 0 ? Number(((junkLeads.length / cLeads.length) * 100).toFixed(1)) : 0,
          wastedSpend: cLeads.length > 0 ? Number(((junkLeads.length / cLeads.length) * spendVal).toFixed(0)) : 0,
          costPerQualifiedLead: qualifiedLeads.length > 0 ? Number((spendVal / qualifiedLeads.length).toFixed(2)) : 0,
        };
      });
    }

    if (selectedDimension === 'platform') {
      const platforms: Record<string, any> = {};
      campaigns.forEach((c: any) => {
        const p = c.platform || 'unknown';
        if (!platforms[p]) platforms[p] = { name: p, leads: 0, spend: 0, conversions: 0, totalQuality: 0, junkLeads: 0 };
        const cLeads = leads.filter((l: any) => l.campaignId === c.id);
        platforms[p].leads += cLeads.length;
        platforms[p].spend += Number(c.dailyBudget ?? 0) * 30;
        platforms[p].conversions += cLeads.filter((l: any) => l.status === 'qualified').length;
        platforms[p].totalQuality += cLeads.reduce((s: number, l: any) => s + (l.qualityScore ?? 0), 0);
        platforms[p].junkLeads += cLeads.filter((l: any) => l.status === 'junk' || (l.qualityScore != null && l.qualityScore < 30)).length;
      });
      return Object.values(platforms).map((p: any) => ({
        ...p,
        cpl: p.leads > 0 ? Number((p.spend / p.leads).toFixed(2)) : 0,
        qualityScore: p.leads > 0 ? Number((p.totalQuality / p.leads).toFixed(1)) : 0,
        conversionRate: p.leads > 0 ? Number(((p.conversions / p.leads) * 100).toFixed(1)) : 0,
        junkRate: p.leads > 0 ? Number(((p.junkLeads / p.leads) * 100).toFixed(1)) : 0,
        wastedSpend: p.leads > 0 ? Number(((p.junkLeads / p.leads) * p.spend).toFixed(0)) : 0,
        costPerQualifiedLead: p.conversions > 0 ? Number((p.spend / p.conversions).toFixed(2)) : 0,
      }));
    }

    // By status
    const statuses: Record<string, any> = {};
    leads.forEach((l: any) => {
      const s = l.status || 'unknown';
      if (!statuses[s]) statuses[s] = { name: s, leads: 0, qualityScore: 0, totalQuality: 0 };
      statuses[s].leads += 1;
      statuses[s].totalQuality += l.qualityScore ?? 0;
    });
    return Object.values(statuses).map((s: any) => ({
      ...s,
      qualityScore: s.leads > 0 ? Number((s.totalQuality / s.leads).toFixed(1)) : 0,
      spend: 0, cpl: 0, conversions: s.name === 'qualified' ? s.leads : 0,
      conversionRate: 0,
      junkRate: s.name === 'junk' ? 100 : 0,
      wastedSpend: 0,
      costPerQualifiedLead: 0,
    }));
  })();

  const handleSave = async () => {
    if (!reportName.trim()) return;
    const config: ReportConfig = {
      metrics: selectedMetrics,
      dimensions: [selectedDimension],
      chartType,
      dateRange: { from: dateFrom, to: dateTo },
    };

    if (activeReportId) {
      await updateSaved.mutateAsync({ id: activeReportId, name: reportName, config });
    } else {
      const result = await createSaved.mutateAsync({ name: reportName, config });
      setActiveReportId(result.id);
    }
  };

  const handleLoad = (report: SavedReport) => {
    setActiveReportId(report.id);
    setReportName(report.name);
    setSelectedMetrics(report.config.metrics);
    setSelectedDimension(report.config.dimensions[0] ?? 'campaign');
    setChartType(report.config.chartType);
    if (report.config.dateRange) {
      setDateFrom(report.config.dateRange.from);
      setDateTo(report.config.dateRange.to);
    }
    setShowSaved(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this saved report?')) {
      await deleteSaved.mutateAsync(id);
      if (activeReportId === id) {
        setActiveReportId(null);
        setReportName('');
      }
    }
  };

  const handleNew = () => {
    setActiveReportId(null);
    setReportName('');
    setSelectedMetrics(['leads', 'spend']);
    setSelectedDimension('campaign');
    setChartType('bar');
  };

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key],
    );
  };

  // Render chart based on type
  const renderChart = () => {
    if (chartData.length === 0) {
      return <div className="h-80 flex items-center justify-center text-gray-400 text-sm">No data available</div>;
    }

    if (chartType === 'pie') {
      const metric = selectedMetrics[0] ?? 'leads';
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChartComponent>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={120}
              dataKey={metric}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
          </PieChartComponent>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
            <Legend />
            {selectedMetrics.map((metric, i) => (
              <Line key={metric} type="monotone" dataKey={metric} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }}
                name={AVAILABLE_METRICS.find(m => m.key === metric)?.label ?? metric}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Bar chart (default)
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }} />
          <Legend />
          {selectedMetrics.map((metric, i) => (
            <Bar key={metric} dataKey={metric} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}
              name={AVAILABLE_METRICS.find(m => m.key === metric)?.label ?? metric}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Custom Report Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Build, preview, and save custom reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNew} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-xl hover:bg-gray-50">
            <Plus size={14} /> New
          </button>
          <button onClick={() => setShowSaved(!showSaved)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-xl hover:bg-gray-50">
            <FolderOpen size={14} /> Saved ({savedReports?.length ?? 0})
          </button>
          <button
            onClick={handleSave}
            disabled={!reportName.trim() || createSaved.isPending || updateSaved.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save size={14} /> {activeReportId ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      {/* Saved Reports Drawer */}
      {showSaved && savedReports && savedReports.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Saved Reports</h3>
          <div className="space-y-2">
            {savedReports.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <button onClick={() => handleLoad(r)} className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.config.chartType} • {r.config.metrics.length} metrics • Updated {new Date(r.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Config Panel */}
        <div className="col-span-4 space-y-5">
          {/* Report Name */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="block text-xs font-medium text-gray-600 mb-2">Report Name</label>
            <input
              type="text"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              placeholder="My Custom Report"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-medium text-gray-600 mb-3">Metrics</h3>
            <div className="space-y-2">
              {AVAILABLE_METRICS.map(m => (
                <label key={m.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(m.key)}
                    onChange={() => toggleMetric(m.key)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dimension */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-medium text-gray-600 mb-3">Dimension</h3>
            {AVAILABLE_DIMENSIONS.map(d => (
              <label key={d.key} className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="radio"
                  name="dimension"
                  checked={selectedDimension === d.key}
                  onChange={() => setSelectedDimension(d.key)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">{d.label}</span>
              </label>
            ))}
          </div>

          {/* Chart Type */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-medium text-gray-600 mb-3">Chart Type</h3>
            <div className="flex gap-2">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.key}
                  onClick={() => setChartType(ct.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    chartType === ct.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ct.icon size={13} /> {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-medium text-gray-600 mb-3">Date Range</h3>
            <div className="space-y-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" aria-label="Date from" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" aria-label="Date to" />
            </div>
          </div>
        </div>

        {/* Chart Preview */}
        <div className="col-span-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {reportName || 'Untitled Report'} — Preview
              </h2>
              <span className="text-xs text-gray-400">
                {AVAILABLE_DIMENSIONS.find(d => d.key === selectedDimension)?.label} •
                {' '}{selectedMetrics.map(m => AVAILABLE_METRICS.find(am => am.key === m)?.label).join(', ')}
              </span>
            </div>
            {renderChart()}
          </div>

          {/* Data Table */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm mt-5 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Data Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Name</th>
                      {selectedMetrics.map(m => (
                        <th key={m} className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                          {AVAILABLE_METRICS.find(am => am.key === m)?.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {chartData.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-800">{row.name}</td>
                        {selectedMetrics.map(m => (
                          <td key={m} className="text-right px-4 py-2 text-gray-600">
                            {typeof row[m] === 'number' ? row[m].toLocaleString() : row[m] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
