import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Zap, Sparkles, BarChart3 } from 'lucide-react';
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow } from '../api/workflows';
import { Badge } from '../components/Badge';

const TRIGGER_TYPES: Record<string, string> = {
  lead_status_change: 'Lead Status Change',
  lead_created: 'Lead Created',
  call_completed: 'Call Completed',
  manual: 'Manual',
  lead_score_change: 'Lead Score Change',
  lead_engagement: 'Lead Engagement',
  time_since_event: 'Time Since Event',
  campaign_performance: 'Campaign Performance',
  batch_execution: 'Batch Execution',
  scheduled: 'Scheduled',
  webhook: 'Webhook',
};

export function Workflows() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '', triggerType: 'manual' });

  const { data: workflows, isLoading } = useWorkflows();
  const createMutation = useCreateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const handleCreate = async () => {
    if (!newWorkflow.name) return;
    try {
      await createMutation.mutateAsync({
        name: newWorkflow.name,
        description: newWorkflow.description,
        triggerConfig: { type: newWorkflow.triggerType },
      });
      setShowCreate(false);
      setNewWorkflow({ name: '', description: '', triggerType: 'manual' });
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleDelete = (workflowId: string) => {
    if (confirm('Delete this workflow?')) {
      deleteMutation.mutate(workflowId);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Automate lead management with custom triggers and actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workflow-analytics')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
          >
            <BarChart3 size={16} /> Analytics
          </button>
          <button
            onClick={() => navigate('/workflow-templates')}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50"
          >
            <Sparkles size={16} /> Templates
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700"
          >
            <Plus size={16} /> New Workflow
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Create Workflow" onKeyDown={(e) => { if (e.key === 'Escape') setShowCreate(false); }}>
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">Create Workflow</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                placeholder="Workflow name"
                aria-label="Workflow name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder="Description"
                aria-label="Description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={newWorkflow.triggerType}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, triggerType: e.target.value })}
                aria-label="Trigger type"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(TRIGGER_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newWorkflow.name || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      ) : !workflows?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Zap size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">No workflows yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600">Trigger</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600">Steps</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600">Executions</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workflows.map((workflow) => (
                <tr key={workflow.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{workflow.name}</p>
                    {workflow.description && <p className="text-sm text-gray-500">{workflow.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      label={TRIGGER_TYPES[workflow.triggerConfig?.type] || workflow.triggerConfig?.type}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{workflow.steps?.length || 0}</td>
                  <td className="px-6 py-4">
                    <Badge label={workflow.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{workflow._count?.executions || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/workflows/${workflow.id}`} className="px-3 py-1.5 text-sm font-medium text-indigo-600">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(workflow.id)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1.5 text-sm font-medium text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
