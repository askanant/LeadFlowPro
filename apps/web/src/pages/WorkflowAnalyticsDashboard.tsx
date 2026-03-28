import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, Clock, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { useWorkflowDashboardAnalytics } from '../api/workflows';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function WorkflowAnalyticsDashboard() {
  const [periodDays, setPeriodDays] = useState(7);
  const { data: analytics, isLoading } = useWorkflowDashboardAnalytics(periodDays);

  if (isLoading) return <LoadingSpinner />;

  const maxDailyTotal = analytics?.dailyTrend.reduce((max, d) => Math.max(max, d.total), 0) ?? 1;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Cross-workflow performance dashboard</p>
        </div>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {!analytics ? (
        <p className="text-gray-500">No analytics data available.</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard icon={Activity} label="Total Workflows" value={analytics.totalWorkflows} sub={`${analytics.activeWorkflows} active`} />
            <KpiCard icon={BarChart3} label="Total Executions" value={analytics.totalExecutions} sub={`Last ${periodDays}d`} />
            <KpiCard icon={CheckCircle2} label="Success Rate" value={`${Math.round(analytics.successRate * 100)}%`} sub={`${analytics.byStatus['completed'] ?? 0} completed`} color="text-green-600" />
            <KpiCard icon={Clock} label="Avg Duration" value={analytics.avgDurationSeconds != null ? `${Math.round(analytics.avgDurationSeconds)}s` : '—'} sub="Per execution" />
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Status Donut Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold mb-4">Execution Status</h2>
              <div className="space-y-3">
                {Object.entries(analytics.byStatus).map(([status, count]) => {
                  const pct = analytics.totalExecutions ? Math.round((count / analytics.totalExecutions) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-20 text-sm font-medium capitalize">{status}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : status === 'running' ? 'bg-blue-500' : 'bg-yellow-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm text-gray-600 text-right">{count} ({pct}%)</div>
                    </div>
                  );
                })}
                {Object.keys(analytics.byStatus).length === 0 && (
                  <p className="text-sm text-gray-400">No executions in this period.</p>
                )}
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} /> Daily Trend</h2>
              <div className="flex items-end gap-1 h-40">
                {analytics.dailyTrend.map((day) => {
                  const completedH = maxDailyTotal ? (day.completed / maxDailyTotal) * 100 : 0;
                  const failedH = maxDailyTotal ? (day.failed / maxDailyTotal) * 100 : 0;
                  const otherH = maxDailyTotal ? ((day.total - day.completed - day.failed) / maxDailyTotal) * 100 : 0;
                  const label = day.date.slice(5); // MM-DD
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${day.date}: ${day.total} total, ${day.completed} ok, ${day.failed} fail`}>
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        {otherH > 0 && <div className="bg-yellow-300 rounded-t" style={{ height: `${otherH}%`, minHeight: otherH > 0 ? '2px' : '0' }} />}
                        {failedH > 0 && <div className="bg-red-400" style={{ height: `${failedH}%`, minHeight: '2px' }} />}
                        {completedH > 0 && <div className="bg-green-400 rounded-b" style={{ height: `${completedH}%`, minHeight: '2px' }} />}
                        {day.total === 0 && <div className="bg-gray-100 rounded" style={{ height: '4px' }} />}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Failed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-300 inline-block" /> Other</span>
              </div>
            </div>
          </div>

          {/* Per-Workflow Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="font-bold mb-4">Per-Workflow Performance</h2>
            {Object.keys(analytics.perWorkflow).length === 0 ? (
              <p className="text-sm text-gray-400">No workflows found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Workflow</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Completed</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Failed</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Success Rate</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(analytics.perWorkflow)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([wId, w]) => (
                        <tr key={wId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link to={`/workflows/${wId}`} className="text-indigo-600 hover:underline font-medium">{w.name}</Link>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{w.total}</td>
                          <td className="px-4 py-3 text-right text-green-600">{w.completed}</td>
                          <td className="px-4 py-3 text-right text-red-600">{w.failed}</td>
                          <td className="px-4 py-3 text-right">{w.total ? `${Math.round((w.completed / w.total) * 100)}%` : '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{w.avgDuration != null ? `${Math.round(w.avgDuration)}s` : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Failures */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> Recent Failures</h2>
            {analytics.recentFailures.length === 0 ? (
              <p className="text-sm text-gray-400">No failures in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Execution</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Workflow</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Triggered</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Error</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {analytics.recentFailures.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{f.id.slice(0, 8)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/workflows/${f.workflowId}`} className="text-indigo-600 hover:underline">{f.workflowName}</Link>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{new Date(f.triggeredAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 text-xs max-w-xs truncate">{f.error || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/workflows/${f.workflowId}/executions/${f.id}`}
                            className="text-indigo-600 hover:underline text-xs font-medium"
                          >
                            Debug
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: typeof Activity; label: string; value: string | number; sub: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-indigo-50"><Icon size={18} className="text-indigo-600" /></div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
