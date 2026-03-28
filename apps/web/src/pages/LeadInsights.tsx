// @ts-nocheck
import React from 'react';
import { useLeadScoringReport } from '../api/ai';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, Activity, Target, AlertCircle, Flame, Thermometer, Snowflake, Trash2 } from 'lucide-react';

export function LeadInsights() {
  const { data: report, isLoading, isError } = useLeadScoringReport();

  if (isLoading) {
    return <LoadingSpinner message="Loading lead insights..." fullScreen />;
  }

  if (isError || !report) {
    return (
      <div className="p-8">
        <EmptyState
          title="Unable to Load Insights"
          description="There was an error loading your lead scoring analytics. Please try again."
        />
      </div>
    );
  }

  if (report.totalLeads === 0) {
    return (
      <div className="p-8">
        <EmptyState
          title="No Leads Yet"
          description="Start capturing leads to see analytics and insights here."
          actionLabel="Create Campaign"
          actionHref="/campaigns"
        />
      </div>
    );
  }

  // Colors for tier visualization
  const tierColors = {
    hot: '#ef4444',
    warm: '#f97316',
    cold: '#3b82f6',
    junk: '#9ca3af',
  };

  // Format timeline data for chart
  const timelineChartData = report.timelineData.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  // Format average scores for bar chart
  const scoresChartData = [
    { name: 'Overall', value: report.averageScores.overall },
    { name: 'Quality', value: report.averageScores.quality },
    { name: 'Engagement', value: report.averageScores.engagement },
    { name: 'Intent', value: report.averageScores.intent },
    { name: 'Firmographic', value: report.averageScores.firmographic },
    { name: 'Risk', value: report.averageScores.risk },
  ];

  // Format distribution for pie chart
  const distributionChartData = [
    { name: 'Hot', value: report.scoreDistribution.hot },
    { name: 'Warm', value: report.scoreDistribution.warm },
    { name: 'Cold', value: report.scoreDistribution.cold },
    { name: 'Junk', value: report.scoreDistribution.junk },
  ];

  const distributionColors = ['#ef4444', '#f97316', '#3b82f6', '#9ca3af'];

  // Format factors for heatmap (scatter plot)
  const factorsChartData = report.topFactors.map((factor, idx) => ({
    x: factor.percentage,
    y: idx,
    name: factor.factor,
    count: factor.count,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
            Lead Intelligence Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analysis of {report.totalLeads} leads across quality, engagement, and conversion metrics
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{report.totalLeads}</p>
              </div>
              <Activity className="w-8 h-8 text-indigo-600 opacity-50" />
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Average Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{report.averageScores.overall}</p>
              </div>
              <Target className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </div>

          {/* Hot Leads % */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Hot Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {Math.round((report.scoreDistribution.hot / report.totalLeads) * 100)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{report.scoreDistribution.hot} leads</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Flame className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Avg Conversion Probability */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Conversion</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {Math.round((report.conversionByTier.hot + report.conversionByTier.warm) / 2 * 100)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Hot + Warm average</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Distribution Pie */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Tier Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={distributionColors[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} leads`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Average Scores Bar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Scores by Dimension</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoresChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Trend */}
        {timelineChartData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Score Trend (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" domain={[0, 100]} label={{ value: 'Avg Score', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Count', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#6366f1" name="Average Score" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#f97316" name="Leads Received" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Conversion by Tier */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Probability by Tier</h2>
            <div className="space-y-3">
              {[
                { tier: 'Hot', key: 'hot', color: 'bg-red-100', Icon: Flame, iconColor: 'text-red-600' },
                { tier: 'Warm', key: 'warm', color: 'bg-orange-100', Icon: Thermometer, iconColor: 'text-orange-600' },
                { tier: 'Cold', key: 'cold', color: 'bg-blue-100', Icon: Snowflake, iconColor: 'text-blue-600' },
                { tier: 'Junk', key: 'junk', color: 'bg-gray-100', Icon: Trash2, iconColor: 'text-gray-600' },
              ].map(({ tier, key, color, Icon, iconColor }) => (
                <div key={key} className="flex items-center">
                  <div className={`${color} rounded-full w-10 h-10 flex items-center justify-center mr-3`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-900">{tier}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(report.conversionByTier[key as keyof typeof report.conversionByTier] * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          key === 'hot'
                            ? 'bg-red-600'
                            : key === 'warm'
                            ? 'bg-orange-600'
                            : key === 'cold'
                            ? 'bg-blue-600'
                            : 'bg-gray-600'
                        }`}
                        style={{
                          width: `${report.conversionByTier[key as keyof typeof report.conversionByTier] * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Factors */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Scoring Factors</h2>
            <div className="space-y-3">
              {report.topFactors.map((factor, idx) => (
                <div key={idx} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{factor.factor}</span>
                      <span className="text-xs font-semibold text-gray-600 ml-2">
                        {factor.count} leads ({factor.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-indigo-600"
                        style={{ width: `${factor.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leads by Factor */}
        {report.leadsByFactor.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Tiers by Factor</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-900">Factor</th>
                    <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-900">Total</th>
                    <th scope="col" className="text-center py-3 px-4 font-semibold text-red-600">Hot</th>
                    <th scope="col" className="text-center py-3 px-4 font-semibold text-orange-600">Warm</th>
                    <th scope="col" className="text-center py-3 px-4 font-semibold text-blue-600">Cold</th>
                    <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-600">Junk</th>
                  </tr>
                </thead>
                <tbody>
                  {report.leadsByFactor.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{item.factor}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600">{item.totalLeads}</td>
                      <td className="py-3 px-4 text-sm text-center text-red-600 font-semibold">{item.tiers.hot}</td>
                      <td className="py-3 px-4 text-sm text-center text-orange-600 font-semibold">{item.tiers.warm}</td>
                      <td className="py-3 px-4 text-sm text-center text-blue-600 font-semibold">{item.tiers.cold}</td>
                      <td className="py-3 px-4 text-sm text-center text-gray-600 font-semibold">{item.tiers.junk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
