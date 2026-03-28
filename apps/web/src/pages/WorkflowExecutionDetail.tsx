import { useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { JsonViewer } from '../components/JsonViewer';
import { useWorkflowExecution, useRetryWorkflowExecution, useRetryWorkflowExecutionFromStep } from '../api/workflows';
import { useSocketEvent } from '../hooks/useSocketEvent';

export function WorkflowExecutionDetail() {
  const { workflowId, executionId } = useParams<{ workflowId: string; executionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: execution, isLoading } = useWorkflowExecution(executionId ?? '');

  // Live updates via WebSocket
  const handleExecutionEvent = useCallback((data: { executionId: string }) => {
    if (data.executionId === executionId) {
      queryClient.invalidateQueries({ queryKey: ['workflow-execution', executionId] });
    }
  }, [executionId, queryClient]);

  const handleStepEvent = useCallback((data: { executionId: string }) => {
    if (data.executionId === executionId) {
      queryClient.invalidateQueries({ queryKey: ['workflow-execution', executionId] });
    }
  }, [executionId, queryClient]);

  useSocketEvent('workflow:execution', handleExecutionEvent);
  useSocketEvent('workflow:step', handleStepEvent);
  const retryMutation = useRetryWorkflowExecution(workflowId);
  const retryFromStepMutation = useRetryWorkflowExecutionFromStep(workflowId);

  const onRetry = async () => {
    if (!executionId) return;

    const res = await retryMutation.mutateAsync(executionId);
    if (res?.executionId) {
      navigate(`/workflows/${workflowId}/executions/${res.executionId}`);
    }
  };

  const onRetryFromStep = async (stepId: string) => {
    if (!executionId) return;

    const res = await retryFromStepMutation.mutateAsync({ executionId, stepId });
    if (res?.executionId) {
      navigate(`/workflows/${workflowId}/executions/${res.executionId}`);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!execution) return <div className="p-8 text-center">Execution not found</div>;

  const formattedDate = (date?: string) => (date ? new Date(date).toLocaleString() : '—');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              Execution {execution.id.slice(0, 8)}
              {execution.metadata?.retryCount && (
                <Badge label={`Retry #${execution.metadata.retryCount}`} variant="secondary" className="ml-2" />
              )}
            </h1>
            <p className="text-sm text-gray-500">Workflow: {execution.workflow?.name || execution.workflowId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {execution.status === 'failed' && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              <RefreshCcw size={16} /> Retry
            </button>
          )}
          <Link
            to={`/workflows/${workflowId}`}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Back to workflow
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold mb-3">Overview</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Status</span>
              <Badge label={execution.status} />
            </div>
            {execution.metadata?.retryCount && (
              <div className="flex justify-between">
                <span>Type</span>
                <Badge label={`Retry #${execution.metadata.retryCount}`} variant="secondary" />
              </div>
            )}
            {execution.metadata?.parentExecutionId && (
              <div className="flex justify-between">
                <span>Parent</span>
                <Link
                  to={`/workflows/${workflowId}/executions/${execution.metadata.parentExecutionId}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {execution.metadata.parentExecutionId.slice(0, 8)}
                </Link>
              </div>
            )}
            <div className="flex justify-between">
              <span>Triggered</span>
              <span>{formattedDate(execution.triggeredAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed</span>
              <span>{formattedDate(execution.completedAt)}</span>
            </div>
            {execution.error && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                <div className="font-medium">Error</div>
                <div className="break-words whitespace-pre-wrap">{execution.error}</div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold mb-3">Lead</h2>
          {execution.lead ? (
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="font-medium">Name: </span>
                {execution.lead.firstName} {execution.lead.lastName}
              </div>
              <div>
                <span className="font-medium">Email: </span>
                {execution.lead.email ?? '—'}
              </div>
              <div>
                <span className="font-medium">Phone: </span>
                {execution.lead.phone ?? '—'}
              </div>
              <div>
                <span className="font-medium">Status: </span>
                {execution.lead.status}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No lead data available</p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold mb-3">Metadata</h2>
          {execution.metadata ? (
            <JsonViewer data={execution.metadata} label="Metadata" />
          ) : (
            <p className="text-sm text-gray-500">No metadata</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-bold mb-4">Step executions</h2>
        {!execution.steps?.length ? (
          <p className="text-sm text-gray-500">No steps recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Step</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Started</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Completed</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Result</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Error</th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {execution.steps.map((step) => (
                  <tr key={step.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{step.step?.actionType || step.stepId}</div>
                      <div className="text-xs text-gray-500">{step.step?.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          label={step.result?.reason === 'resumed' ? 'Skipped (Resumed)' : step.status}
                          variant={step.result?.reason === 'resumed' ? 'outline' : 'default'}
                        />
                        {step.result?.reason === 'resumed' && (
                          <span className="text-xs text-gray-500">Resumed from later step</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formattedDate(step.startedAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{formattedDate(step.completedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {step.result ? (
                        <JsonViewer
                          data={step.result}
                          defaultExpanded={false}
                          className="max-h-32"
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {step.error ? <div className="whitespace-pre-wrap">{step.error}</div> : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {step.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => onRetryFromStep(step.id)}
                          disabled={retryFromStepMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                        >
                          Retry from here
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
