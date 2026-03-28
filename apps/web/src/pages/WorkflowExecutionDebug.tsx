import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, CheckCircle2, XCircle, Clock, SkipForward, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { JsonViewer } from '../components/JsonViewer';
import { useWorkflowExecution, useRetryWorkflowExecution, useRetryWorkflowExecutionFromStep } from '../api/workflows';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  running: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-100' },
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  skipped: { icon: SkipForward, color: 'text-gray-400', bg: 'bg-gray-100' },
};

export function WorkflowExecutionDebug() {
  const { id: workflowId, executionId } = useParams<{ id: string; executionId: string }>();
  const navigate = useNavigate();

  const { data: execution, isLoading } = useWorkflowExecution(executionId ?? '');
  const retryMutation = useRetryWorkflowExecution(workflowId);
  const retryFromStepMutation = useRetryWorkflowExecutionFromStep(workflowId);

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  };

  const expandAll = () => {
    if (!execution?.steps) return;
    setExpandedSteps(new Set(execution.steps.map((s) => s.id)));
  };

  const collapseAll = () => setExpandedSteps(new Set());

  const onRetry = async () => {
    if (!executionId) return;
    const res = await retryMutation.mutateAsync(executionId);
    if (res?.executionId) {
      navigate(`/workflows/${workflowId}/debug/${res.executionId}`);
    }
  };

  const onRetryFromStep = async (stepId: string) => {
    if (!executionId) return;
    const res = await retryFromStepMutation.mutateAsync({ executionId, stepId });
    if (res?.executionId) {
      navigate(`/workflows/${workflowId}/debug/${res.executionId}`);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!execution) return <div className="p-8 text-center text-gray-500">Execution not found</div>;

  const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : '—');
  const fmtMs = (d?: string) => (d ? new Date(d).toISOString().split('T')[1].replace('Z', '') : '—');

  const totalDuration = execution.completedAt
    ? Math.round((new Date(execution.completedAt).getTime() - new Date(execution.triggeredAt).getTime()) / 1000)
    : null;

  // Sort steps by start time, then by order
  const sortedSteps = [...(execution.steps ?? [])].sort((a, b) => {
    if (a.startedAt && b.startedAt) return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    return (a.order ?? 0) - (b.order ?? 0);
  });

  // Compute waterfall timings
  const execStart = new Date(execution.triggeredAt).getTime();
  const execEnd = execution.completedAt ? new Date(execution.completedAt).getTime() : Date.now();
  const execSpan = Math.max(execEnd - execStart, 1);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Debug Trace
              <span className="font-mono text-base text-gray-500">{executionId?.slice(0, 8)}</span>
              {execution.metadata?.retryCount && (
                <Badge label={`Retry #${execution.metadata.retryCount}`} variant="secondary" />
              )}
            </h1>
            <p className="text-sm text-gray-500">
              {execution.workflow?.name ?? 'Workflow'} &middot; {fmt(execution.triggeredAt)}
              {totalDuration !== null && <span className="ml-2 text-gray-400">({totalDuration}s total)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {execution.status === 'failed' && (
            <button type="button" onClick={onRetry} disabled={retryMutation.isPending} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40">
              <RefreshCcw size={16} /> Retry All
            </button>
          )}
          <Link to={`/workflows/${workflowId}`} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Back to workflow
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Status" value={execution.status} badge />
        <SummaryCard label="Steps" value={`${sortedSteps.length} step${sortedSteps.length !== 1 ? 's' : ''}`} />
        <SummaryCard label="Duration" value={totalDuration !== null ? `${totalDuration}s` : '—'} />
        <SummaryCard label="Lead" value={execution.lead ? `${execution.lead.firstName} ${execution.lead.lastName}` : '—'} />
      </div>

      {execution.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-red-700 mb-1">Execution Error</p>
          <p className="text-sm text-red-600 whitespace-pre-wrap break-words">{execution.error}</p>
        </div>
      )}

      {/* Waterfall Timeline */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Step Timeline (Waterfall)</h2>
          <div className="text-xs text-gray-400">
            {fmt(execution.triggeredAt)} → {execution.completedAt ? fmt(execution.completedAt) : 'in progress'}
          </div>
        </div>
        <div className="space-y-1">
          {sortedSteps.map((step) => {
            const stepStart = step.startedAt ? new Date(step.startedAt).getTime() : execStart;
            const stepEnd = step.completedAt ? new Date(step.completedAt).getTime() : stepStart;
            const leftPct = ((stepStart - execStart) / execSpan) * 100;
            const widthPct = Math.max(((stepEnd - stepStart) / execSpan) * 100, 1);
            const isResumed = step.result?.reason === 'resumed';
            const statusCfg = STATUS_CONFIG[isResumed ? 'skipped' : step.status] ?? STATUS_CONFIG.pending;

            return (
              <div key={step.id} className="flex items-center gap-3 h-8">
                <div className="w-32 text-xs truncate text-gray-600 font-medium">{step.step?.actionType ?? step.stepId}</div>
                <div className="flex-1 relative h-5 bg-gray-50 rounded overflow-hidden">
                  <div
                    className={`absolute h-full rounded ${step.status === 'completed' ? 'bg-green-400' : step.status === 'failed' ? 'bg-red-400' : step.status === 'running' ? 'bg-blue-400' : 'bg-gray-300'}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '4px' }}
                    title={`${step.step?.actionType}: ${step.status} (${step.startedAt ? fmtMs(step.startedAt) : '?'} → ${step.completedAt ? fmtMs(step.completedAt) : '?'})`}
                  />
                </div>
                <div className={`w-16 text-xs ${statusCfg.color}`}>{isResumed ? 'skipped' : step.status}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Step Trace */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Step-by-Step Trace</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={expandAll} className="text-xs text-indigo-600 hover:underline">Expand all</button>
            <span className="text-gray-300">|</span>
            <button type="button" onClick={collapseAll} className="text-xs text-indigo-600 hover:underline">Collapse all</button>
          </div>
        </div>

        {sortedSteps.length === 0 ? (
          <p className="text-sm text-gray-400">No steps recorded.</p>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gray-200" />

            <div className="space-y-2">
              {sortedSteps.map((step, idx) => {
                const isResumed = step.result?.reason === 'resumed';
                const statusKey = isResumed ? 'skipped' : step.status;
                const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                const expanded = expandedSteps.has(step.id);
                const stepDuration = step.startedAt && step.completedAt
                  ? Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()))
                  : null;

                return (
                  <div key={step.id} className="relative pl-12">
                    {/* Node circle */}
                    <div className={`absolute left-3 top-3 w-5 h-5 rounded-full ${cfg.bg} flex items-center justify-center z-10`}>
                      <Icon size={12} className={cfg.color} />
                    </div>

                    <div className={`border rounded-xl p-4 ${step.status === 'failed' ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:bg-gray-50'} cursor-pointer transition`} onClick={() => toggleStep(step.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                          <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                          <span className="font-medium text-sm">{step.step?.actionType ?? step.stepId}</span>
                          <Badge label={isResumed ? 'Skipped (Resumed)' : step.status} variant={isResumed ? 'outline' : 'default'} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {stepDuration !== null && <span>{stepDuration}ms</span>}
                          <span>{step.startedAt ? fmtMs(step.startedAt) : '—'}</span>
                          {step.status === 'failed' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onRetryFromStep(step.id); }}
                              disabled={retryFromStepMutation.isPending}
                              className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-40"
                            >
                              Retry from here
                            </button>
                          )}
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div><span className="text-gray-500">Started:</span> <span className="text-gray-700">{fmt(step.startedAt)}</span></div>
                            <div><span className="text-gray-500">Completed:</span> <span className="text-gray-700">{fmt(step.completedAt)}</span></div>
                            <div><span className="text-gray-500">Step ID:</span> <span className="font-mono text-gray-600">{step.stepId}</span></div>
                            <div><span className="text-gray-500">Duration:</span> <span className="text-gray-700">{stepDuration !== null ? `${stepDuration}ms` : '—'}</span></div>
                          </div>

                          {step.result && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Result</p>
                              <JsonViewer data={step.result} defaultExpanded={false} className="max-h-48" />
                            </div>
                          )}

                          {step.error && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-xs font-medium text-red-700 mb-1">Error</p>
                              <p className="text-xs text-red-600 whitespace-pre-wrap break-words">{step.error}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      {execution.metadata && Object.keys(execution.metadata).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="font-bold mb-3">Execution Metadata</h2>
          <JsonViewer data={execution.metadata} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      {badge ? <Badge label={value} /> : <p className="text-lg font-bold text-gray-900">{value}</p>}
    </div>
  );
}
