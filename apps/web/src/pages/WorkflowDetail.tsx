import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Save, Plus, Trash2, Zap, Clock, Webhook, Play, Pause, RefreshCcw, Paintbrush2, Copy, Calendar } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import {
  useWorkflowById,
  useUpdateWorkflow,
  useAddWorkflowStep,
  useDeleteWorkflowStep,
  useCloneWorkflow,
  useWorkflowVersions,
  useRestoreWorkflowVersion,
  useTriggers,
  useCreateTrigger,
  useDeleteTrigger,
  useActivateTrigger,
  useDeactivateTrigger,
  useTestTrigger,
  useWorkflowExecutions,
  useWorkflowExecution,
  useWorkflowAnalytics,
  useRetryWorkflowExecution,
  useRetryWorkflowExecutionFromStep,
} from "../api/workflows";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Badge } from "../components/Badge";

const ACTION_TYPES = [
  { value: "notify-agents", label: "Notify Agents" },
  { value: "update-quality", label: "Update Quality Score" },
  { value: "assign-agent", label: "Assign to Agent" },
  { value: "log-event", label: "Log Event" },
  { value: "update-metrics", label: "Update Metrics" },
  { value: "condition-check", label: "Check Conditions" },
  { value: "send-email", label: "Send Email" },
  { value: "send-sms", label: "Send SMS" },
  { value: "send-webhook", label: "Send Webhook" },
  { value: "update-lead", label: "Update Lead" },
  { value: "assign-campaign", label: "Assign Campaign" },
  { value: "create-task", label: "Create Task" },
  { value: "add-note", label: "Add Note" },
  { value: "create-event", label: "Create Event" },
];

const TRIGGER_TYPES = [
  { value: "scheduled", label: "Scheduled", icon: Clock, description: "Run on a schedule (cron)" },
  { value: "webhook", label: "Webhook", icon: Webhook, description: "Trigger via external webhook" },
  { value: "lead_status_change", label: "Lead Status Change", icon: Zap, description: "When lead status changes" },
  { value: "lead_created", label: "Lead Created", icon: Plus, description: "When a new lead is created" },
  { value: "call_completed", label: "Call Completed", icon: Zap, description: "When a call completes" },
  { value: "manual", label: "Manual", icon: Play, description: "Manual trigger only" },
  { value: "lead_score_change", label: "Lead Score Change", icon: Zap, description: "When lead score changes" },
  { value: "lead_engagement", label: "Lead Engagement", icon: Zap, description: "When lead engages (email open, click, etc.)" },
  { value: "time_since_event", label: "Time Since Event", icon: Clock, description: "After N days since an event" },
  { value: "campaign_performance", label: "Campaign Performance", icon: Zap, description: "When campaign metrics cross thresholds" },
  { value: "batch_execution", label: "Batch Execution", icon: Zap, description: "Process leads in bulk by filters" },
];

export function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflowById(id || "");
  const updateMutation = useUpdateWorkflow(id || "");
  const addStepMutation = useAddWorkflowStep(id || "");
  const deleteStepMutation = useDeleteWorkflowStep(id || "");
  const cloneMutation = useCloneWorkflow();

  // Versioning
  const { data: versions = [] } = useWorkflowVersions(id || '');
  const restoreVersion = useRestoreWorkflowVersion(id || '');

  // Trigger management
  const { data: triggers } = useTriggers(id || "");
  const createTriggerMutation = useCreateTrigger(id || "");
  const deleteTriggerMutation = useDeleteTrigger(id || "");
  const activateTriggerMutation = useActivateTrigger(id || "");
  const deactivateTriggerMutation = useDeactivateTrigger(id || "");
  const testTriggerMutation = useTestTrigger(id || "");

  const queryClient = useQueryClient();
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [resumeExecutionId, setResumeExecutionId] = useState<string | null>(null);
  const [resumeStepId, setResumeStepId] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const { data: analytics } = useWorkflowAnalytics(id || '', periodDays);
  const { data: executions = [], isLoading: executionsLoading } = useWorkflowExecutions(id || '');
  const { data: resumeExecution } = useWorkflowExecution(resumeExecutionId || '');
  const retryExecution = useRetryWorkflowExecution(id);
  const retryFromStep = useRetryWorkflowExecutionFromStep(id);

  const filteredExecutions = statusFilter
    ? executions.filter((e) => e.status === statusFilter)
    : executions;

  const [editingWorkflow, setEditingWorkflow] = useState<typeof workflow | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>("");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});

  if (isLoading) return <LoadingSpinner />;
  if (!workflow) return <div className="p-8 text-center">Workflow not found</div>;

  const handleSaveWorkflow = async () => {
    if (!editingWorkflow) return;
    try {
      await updateMutation.mutateAsync({
        name: editingWorkflow.name,
        description: editingWorkflow.description,
        status: editingWorkflow.status,
      });
      setEditingWorkflow(null);
    } catch (error) {
      console.error("Failed:", error);
    }
  };

  const handleAddStep = async () => {
    try {
      await addStepMutation.mutateAsync({
        order: (workflow.steps?.length || 0),
        actionType: "notify-agents",
        isEnabled: true,
      });
      setShowAddStep(false);
    } catch (error) {
      console.error("Failed:", error);
    }
  };

  const handleDeleteStep = (stepId: string) => {
    if (confirm("Delete?")) {
      deleteStepMutation.mutate(stepId);
    }
  };

  const handleCreateTrigger = async () => {
    if (!selectedTriggerType) return;

    try {
      await createTriggerMutation.mutateAsync({
        type: selectedTriggerType,
        config: triggerConfig,
      });
      setShowAddTrigger(false);
      setSelectedTriggerType("");
      setTriggerConfig({});
    } catch (error) {
      console.error("Failed to create trigger:", error);
    }
  };

  const handleDeleteTrigger = (triggerId: string) => {
    if (confirm("Delete this trigger?")) {
      deleteTriggerMutation.mutate(triggerId);
    }
  };

  const handleToggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateTriggerMutation.mutateAsync(triggerId);
      } else {
        await activateTriggerMutation.mutateAsync(triggerId);
      }
    } catch (error) {
      console.error("Failed to toggle trigger:", error);
    }
  };

  const handleTestTrigger = async (triggerId: string) => {
    try {
      await testTriggerMutation.mutateAsync(triggerId);
    } catch (error) {
      console.error("Failed to test trigger:", error);
    }
  };

  const handleRetryExecution = async (executionId: string) => {
    try {
      const result = await retryExecution.mutateAsync(executionId);
      if (result?.executionId) {
        navigate(`/workflows/${id}/executions/${result.executionId}`);
      }
    } catch (error) {
      console.error("Failed to retry execution:", error);
    }
  };

  const openResumeModal = (executionId: string) => {
    setResumeExecutionId(executionId);
    setResumeStepId(null);
    setIsResumeModalOpen(true);
  };

  const closeResumeModal = () => {
    setIsResumeModalOpen(false);
    setResumeExecutionId(null);
    setResumeStepId(null);
  };

  const handleResumeFromStep = async () => {
    if (!resumeExecutionId || !resumeStepId) return;
    try {
      const result = await retryFromStep.mutateAsync({ executionId: resumeExecutionId, stepId: resumeStepId });
      if (result?.executionId) {
        closeResumeModal();
        navigate(`/workflows/${id}/executions/${result.executionId}`);
      }
    } catch (error) {
      console.error("Failed to resume from step:", error);
    }
  };

  const downloadCsv = (rows: (string | number)[][], filename: string) => {
    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExecutions = () => {
    const headers = [
      'Execution ID',
      'Triggered At',
      'Completed At',
      'Status',
      'Duration (s)',
      'Lead ID',
      'Lead Name',
      'Error',
      'Parent Execution',
      'Retry Count',
    ];

    const rows = filteredExecutions.map((execution) => {
      const startedAt = new Date(execution.triggeredAt);
      const completedAt = execution.completedAt ? new Date(execution.completedAt) : null;
      const duration = completedAt ? Math.max(0, (completedAt.getTime() - startedAt.getTime()) / 1000) : null;

      return [
        execution.id,
        startedAt.toISOString(),
        completedAt?.toISOString() ?? '',
        execution.status,
        duration != null ? Math.round(duration) : '',
        execution.lead?.id ?? '',
        execution.lead ? `${execution.lead.firstName} ${execution.lead.lastName}` : '',
        execution.error ?? '',
        execution.metadata?.parentExecutionId ?? '',
        execution.metadata?.retryCount ?? '',
      ];
    });

    downloadCsv([headers, ...rows], `workflow-${id}-executions.csv`);
  };

  const handleExportAnalytics = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total executions', analytics?.total ?? ''],
      ['Success rate', analytics ? `${Math.round(analytics.successRate * 100)}%` : ''],
      ['Avg duration (s)', analytics?.avgDurationSeconds != null ? Math.round(analytics.avgDurationSeconds) : ''],
      ['Failed count', analytics?.failedCount ?? ''],
    ];
    downloadCsv([headers, ...rows], `workflow-${id}-analytics.csv`);
  };

  const renderTriggerConfig = () => {
    switch (selectedTriggerType) {
      case "scheduled":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cron Expression</label>
              <input
                type="text"
                placeholder="0 9 * * MON"
                value={triggerConfig.cronExpression || ""}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, cronExpression: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Examples: "0 9 * * MON" (9am Monday), "0 */2 * * *" (every 2 hours)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select
                value={triggerConfig.timezone || "UTC"}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, timezone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Events</label>
              <input
                type="text"
                placeholder="lead.created,lead.updated"
                value={triggerConfig.events?.join(",") || ""}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, events: e.target.value.split(",").map(s => s.trim()) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated event types to listen for</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Webhook URL will be generated automatically</strong><br />
                Use this URL in your external service to trigger this workflow.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{workflow.name}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/workflows/${id}/builder`)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            <Paintbrush2 size={14} /> Visual Builder
          </button>
          <button
            onClick={() => navigate(`/workflows/${id}/schedule`)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            <Calendar size={14} /> Schedule
          </button>
          <button
            onClick={async () => {
              if (!id) return;
              const result = await cloneMutation.mutateAsync({ workflowId: id });
              if (result?.id) navigate(`/workflows/${result.id}`);
            }}
            disabled={cloneMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            <Copy size={14} /> {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
          </button>
          <button onClick={() => navigate("/workflows")} className="px-4 py-2 border rounded-lg">
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-bold mb-4">Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={editingWorkflow?.name || workflow.name}
                onChange={(e) => setEditingWorkflow({ ...workflow, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={editingWorkflow?.status || workflow.status}
                onChange={(e) => setEditingWorkflow({ ...workflow, status: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              onClick={handleSaveWorkflow}
              disabled={!editingWorkflow}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              <Save size={16} /> Save
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Triggers Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Triggers</h2>
              <button
                onClick={() => setShowAddTrigger(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg"
              >
                <Plus size={14} /> Add Trigger
              </button>
            </div>

            {showAddTrigger && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Trigger Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TRIGGER_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setSelectedTriggerType(type.value)}
                          className={`p-3 border rounded-lg text-left ${
                            selectedTriggerType === type.value
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <type.icon size={16} />
                            <div>
                              <div className="font-medium text-sm">{type.label}</div>
                              <div className="text-xs text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedTriggerType && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Configuration</label>
                      {renderTriggerConfig()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTrigger}
                      disabled={!selectedTriggerType}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Create Trigger
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTrigger(false);
                        setSelectedTriggerType("");
                        setTriggerConfig({});
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {!triggers?.length ? (
                <p className="text-center text-gray-500 py-8">No triggers configured</p>
              ) : (
                triggers.map((trigger) => (
                  <div key={trigger.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {React.createElement(
                          TRIGGER_TYPES.find(t => t.value === trigger.type)?.icon || Zap,
                          { size: 16, className: "text-gray-600" }
                        )}
                        <p className="font-medium text-sm">
                          {TRIGGER_TYPES.find(t => t.value === trigger.type)?.label || trigger.type}
                        </p>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          trigger.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {trigger.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {trigger.type === "scheduled" && trigger.schedule && (
                        <p className="text-xs text-gray-500 mt-1">
                          {trigger.schedule.cronExpression} ({trigger.schedule.timezone})
                        </p>
                      )}
                      {trigger.type === "webhook" && trigger.webhookUrl && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500 font-mono break-all flex-1 bg-gray-100 px-2 py-1 rounded">
                              {trigger.webhookUrl}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(trigger.webhookUrl || '');
                                alert('Webhook URL copied!');
                              }}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded shrink-0"
                              title="Copy URL"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          {trigger.webhookSecret && (
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded flex-1">
                                Secret: ••••••••{trigger.webhookSecret.slice(-6)}
                              </p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(trigger.webhookSecret || '');
                                  alert('Webhook secret copied!');
                                }}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded shrink-0"
                                title="Copy Secret"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestTrigger(trigger.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Test trigger"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleTrigger(trigger.id, trigger.isActive)}
                        className={`p-2 rounded-lg ${
                          trigger.isActive
                            ? "text-orange-600 hover:bg-orange-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                        title={trigger.isActive ? "Deactivate" : "Activate"}
                      >
                        {trigger.isActive ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(trigger.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Steps Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Steps</h2>
              <button onClick={() => setShowAddStep(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg">
                <Plus size={14} /> Add
              </button>
            </div>

            {showAddStep && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-2">
                  <button onClick={handleAddStep} className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">
                    Add Notify Step
                  </button>
                  <button onClick={() => setShowAddStep(false)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {!workflow.steps?.length ? (
                <p className="text-center text-gray-500 py-8">No steps</p>
              ) : (
                workflow.steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-500">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ACTION_TYPES.find(a => a.value === step.actionType)?.label || step.actionType}</p>
                      {step.nextStepOnSuccess && (
                        <p className="text-xs text-green-600">→ Success: Step {workflow.steps?.find(s => s.id === step.nextStepOnSuccess)?.order ?? '?'}</p>
                      )}
                      {step.nextStepOnFailure && (
                        <p className="text-xs text-red-600">→ Failure: Step {workflow.steps?.find(s => s.id === step.nextStepOnFailure)?.order ?? '?'}</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteStep(step.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" aria-label="Delete step">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Execution Analytics */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Execution Analytics</h2>
              <div className="flex items-center gap-2">
                <select
                  value={periodDays}
                  onChange={(e) => setPeriodDays(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  onClick={handleExportAnalytics}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg"
                >
                  Export CSV
                </button>
                {/* end header actions */}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-medium text-gray-500">Success rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics ? `${Math.round(analytics.successRate * 100)}%` : '—'}</p>
                </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500">Avg duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.avgDurationSeconds != null ? `${Math.round(analytics.avgDurationSeconds)}s` : '—'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-500">Failures</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.failedCount ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Version History */}
          {versions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
              <h2 className="font-bold mb-4">Version History</h2>
              <div className="space-y-3">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <span className="text-sm font-medium">v{v.version}</span>
                      {v.changeDescription && (
                        <span className="text-sm text-gray-500 ml-2">— {v.changeDescription}</span>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(v.createdAt).toLocaleString()}
                        {v.createdBy && ` by ${v.createdBy}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Restore workflow to version ${v.version}? Current state will be saved as a new version.`)) {
                          restoreVersion.mutateAsync(v.id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                    >
                      <RefreshCcw size={12} className="inline mr-1" />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution History */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Execution History</h2>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
                <button
                  onClick={handleExportExecutions}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['workflows', id, 'executions'] })}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg"
                >
                  <RefreshCcw size={14} /> Refresh
                </button>
              </div>
            </div>

            {executionsLoading ? (
              <LoadingSpinner />
            ) : !filteredExecutions?.length ? (
              <p className="text-sm text-gray-500">No executions match the selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Lead</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Duration</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-medium text-gray-500">Error</th>
                      <th scope="col" className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredExecutions.map((execution) => {
                      const startedAt = new Date(execution.triggeredAt);
                      const completedAt = execution.completedAt ? new Date(execution.completedAt) : null;
                      const duration = completedAt ? Math.max(0, (completedAt.getTime() - startedAt.getTime()) / 1000) : null;

                      return (
                        <tr key={execution.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">{startedAt.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {execution.metadata?.retryCount ? (
                                <Badge label={`Retry #${execution.metadata.retryCount}`} variant="secondary" />
                              ) : (
                                <Badge label="Original" variant="outline" />
                              )}
                              {execution.metadata?.parentExecutionId && (
                                <div className="text-xs text-gray-500">
                                  Parent: <Link
                                    to={`/workflows/${id}/executions/${execution.metadata.parentExecutionId}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {execution.metadata.parentExecutionId.slice(0, 8)}
                                  </Link>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {execution.lead ? (
                              <Link to={`/leads/${execution.lead.id}`} className="text-blue-600 hover:underline">
                                {execution.lead.firstName} {execution.lead.lastName}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={execution.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">{duration != null ? `${Math.round(duration)}s` : '—'}</td>
                          <td className="px-4 py-3 text-sm text-red-600">
                            {execution.error ? <span className="break-words">{execution.error}</span> : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/workflows/${id}/executions/${execution.id}`}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-600"
                              >
                                View
                              </Link>
                              <Link
                                to={`/workflows/${id}/debug/${execution.id}`}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600"
                              >
                                Debug
                              </Link>
                              {execution.status === 'failed' && (
                                <>
                                  <button
                                    onClick={() => handleRetryExecution(execution.id)}
                                    disabled={retryExecution.isPending}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                                  >
                                    Retry
                                  </button>
                                  <button
                                    onClick={() => openResumeModal(execution.id)}
                                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                                  >
                                    Resume
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {isResumeModalOpen && resumeExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold">Resume execution from step</h3>
              <button
                type="button"
                onClick={closeResumeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Select a step from the failed execution <span className="font-medium">{resumeExecution.id.slice(0, 8)}</span>.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Step</label>
                <select
                  value={resumeStepId ?? ''}
                  onChange={(e) => setResumeStepId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select a step to resume from</option>
                  {resumeExecution.steps?.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.step?.actionType || step.stepId} ({step.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeResumeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResumeFromStep}
                  disabled={!resumeStepId || retryFromStep.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
                >
                  Resume from selected step
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
