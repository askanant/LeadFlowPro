import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Save,
  ArrowLeft,
  Trash2,
  Zap,
  Mail,
  MessageSquare,
  Webhook,
  UserCheck,
  FileText,
  BarChart3,
  CheckCircle2,
  Settings2,
  X,
  Check,
} from 'lucide-react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  useWorkflowById,
  useAddWorkflowStep,
  useDeleteWorkflowStep,
} from '../api/workflows';
import { LoadingSpinner } from '../components/LoadingSpinner';

// All available action types with their metadata
const ALL_ACTION_TYPES = [
  { value: 'condition-check', label: 'Check Conditions', icon: CheckCircle2, category: 'Logic', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'notify-agents', label: 'Notify Agents', icon: Zap, category: 'Communication', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'send-email', label: 'Send Email', icon: Mail, category: 'Communication', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'send-sms', label: 'Send SMS', icon: MessageSquare, category: 'Communication', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'send-webhook', label: 'Send Webhook', icon: Webhook, category: 'Integration', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'assign-agent', label: 'Assign Agent', icon: UserCheck, category: 'Assignment', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'assign-campaign', label: 'Assign Campaign', icon: BarChart3, category: 'Assignment', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'update-lead', label: 'Update Lead', icon: FileText, category: 'Data', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { value: 'update-quality', label: 'Update Quality Score', icon: BarChart3, category: 'Data', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'create-task', label: 'Create Task', icon: FileText, category: 'Task', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'add-note', label: 'Add Note', icon: FileText, category: 'Data', color: 'bg-lime-100 text-lime-700 border-lime-300' },
  { value: 'create-event', label: 'Create Event', icon: Zap, category: 'Analytics', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { value: 'update-metrics', label: 'Update Metrics', icon: BarChart3, category: 'Analytics', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'log-event', label: 'Log Event', icon: FileText, category: 'Analytics', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

const ACTION_CATEGORIES = ['Logic', 'Communication', 'Assignment', 'Data', 'Task', 'Integration', 'Analytics'];

interface StepNode {
  id: string;
  order: number;
  actionType: string;
  config: Record<string, any>;
  isEnabled: boolean;
  nextStepOnSuccess?: string;
  nextStepOnFailure?: string;
  conditions?: Record<string, any>;
}

// ─── Custom React Flow Nodes ───────────────────────────────────────────────

function TriggerNodeComponent({ data }: NodeProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl px-6 py-4 shadow-lg min-w-[200px]">
      <div className="flex items-center gap-3">
        <Zap size={20} />
        <div>
          <p className="font-semibold text-sm">Trigger</p>
          <p className="text-xs text-indigo-100">{(data as any).triggerType || 'Manual'}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-300 !w-3 !h-3" />
    </div>
  );
}

function ActionNodeComponent({ data }: NodeProps) {
  const d = data as any;
  const actionMeta = ALL_ACTION_TYPES.find((a) => a.value === d.actionType);
  const isSelected = d.isSelected;

  return (
    <div
      className={`bg-white rounded-xl border-2 px-5 py-4 shadow-sm min-w-[220px] max-w-[280px] transition-all ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
      } ${!d.isEnabled ? 'opacity-60' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${actionMeta?.color || 'bg-gray-100'}`}>
          {actionMeta && React.createElement(actionMeta.icon, { size: 16 })}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{actionMeta?.label || d.actionType}</p>
          <p className="text-xs text-gray-500">{actionMeta?.category}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!d.isEnabled && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Off</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              d.onDelete?.(d.stepId);
            }}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
            aria-label="Delete step"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Config summary */}
      {d.config && Object.keys(d.config).length > 0 && (
        <div className="mt-2 text-xs text-gray-500 truncate">
          {d.actionType === 'send-email' && d.config.subject && (
            <span>Subject: {d.config.subject}</span>
          )}
          {d.actionType === 'notify-agents' && d.config.message && (
            <span>{d.config.message.slice(0, 40)}...</span>
          )}
          {d.actionType === 'condition-check' && <span>Condition rules</span>}
          {d.actionType === 'create-task' && d.config.title && (
            <span>Task: {d.config.title}</span>
          )}
        </div>
      )}

      {/* Condition nodes get two output handles */}
      {d.actionType === 'condition-check' ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="success"
            className="!bg-green-500 !w-3 !h-3 !-translate-x-5"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="failure"
            className="!bg-red-500 !w-3 !h-3 !translate-x-5"
          />
          <div className="flex justify-between mt-2 text-xs px-1">
            <Check size={12} className="text-green-600" />
            <X size={12} className="text-red-600" />
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
      )}
    </div>
  );
}

function EndNodeComponent(_props: NodeProps) {
  return (
    <div className="bg-gray-800 text-white rounded-xl px-6 py-3 shadow-lg min-w-[160px] text-center">
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3" />
      <p className="font-semibold text-sm">End</p>
      <p className="text-xs text-gray-400">Workflow complete</p>
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNodeComponent,
  action: ActionNodeComponent,
  end: EndNodeComponent,
};

function ActionConfigPanel({
  step,
  onUpdate,
  onClose,
}: {
  step: StepNode;
  onUpdate: (config: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<Record<string, any>>(step.config || {});
  const actionMeta = ALL_ACTION_TYPES.find((a) => a.value === step.actionType);

  const updateField = (field: string, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(config);
    onClose();
  };

  const renderConfigFields = () => {
    switch (step.actionType) {
      case 'send-email':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="Welcome, {{firstName}}!"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="Hi {{firstName}},\n\nThank you for your interest..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email (optional)</label>
              <input
                type="email"
                value={config.recipientEmail || ''}
                onChange={(e) => updateField('recipientEmail', e.target.value)}
                placeholder="Leave empty to use lead's email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case 'send-sms':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => updateField('message', e.target.value)}
                placeholder="Hi {{firstName}}, we have an update for you..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Phone (optional)</label>
              <input
                type="tel"
                value={config.recipientPhone || ''}
                onChange={(e) => updateField('recipientPhone', e.target.value)}
                placeholder="Leave empty to use lead's phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case 'send-webhook':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={config.url || ''}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={config.method || 'POST'}
                onChange={(e) => updateField('method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.includeLeadData !== false}
                onChange={(e) => updateField('includeLeadData', e.target.checked)}
                className="rounded"
              />
              Include lead data in payload
            </label>
          </>
        );

      case 'update-lead':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Status (optional)</label>
              <select
                value={config.status || ''}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Don't change</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="junk">Junk</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality Score (optional)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.qualityScore ?? ''}
                onChange={(e) => updateField('qualityScore', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0-100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case 'update-quality':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Score Adjustment</label>
              <input
                type="number"
                value={config.scoreAdjustment ?? ''}
                onChange={(e) => updateField('scoreAdjustment', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="+10 or -5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Positive to increase, negative to decrease</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set Score (absolute)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.setScore ?? ''}
                onChange={(e) => updateField('setScore', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Set to exact value (0-100)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case 'assign-agent':
        return (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.roundRobin || false}
                onChange={(e) => updateField('roundRobin', e.target.checked)}
                className="rounded"
              />
              Round-robin assignment (auto-select agent with fewest leads)
            </label>
            {!config.roundRobin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent ID</label>
                <input
                  type="text"
                  value={config.agentId || ''}
                  onChange={(e) => updateField('agentId', e.target.value)}
                  placeholder="Specific agent UUID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}
          </>
        );

      case 'assign-campaign':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID</label>
            <input
              type="text"
              value={config.campaignId || ''}
              onChange={(e) => updateField('campaignId', e.target.value)}
              placeholder="Campaign UUID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        );

      case 'create-task':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Follow up with {{firstName}} {{lastName}}"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={config.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due In (days)</label>
                <input
                  type="number"
                  min={1}
                  value={config.dueInDays ?? 1}
                  onChange={(e) => updateField('dueInDays', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={config.priority || 'medium'}
                  onChange={(e) => updateField('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </>
        );

      case 'add-note':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note Content</label>
            <textarea
              value={config.content || ''}
              onChange={(e) => updateField('content', e.target.value)}
              placeholder="Lead {{firstName}} {{lastName}} was processed by workflow."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        );

      case 'notify-agents':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Message</label>
            <textarea
              value={config.message || ''}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="New lead {{firstName}} {{lastName}} needs attention"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        );

      case 'create-event':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <input
                type="text"
                value={config.eventType || ''}
                onChange={(e) => updateField('eventType', e.target.value)}
                placeholder="lead_processed"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </>
        );

      case 'condition-check':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conditions (JSON)</label>
            <textarea
              value={config.conditionGroups ? JSON.stringify(config.conditionGroups, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateField('conditionGroups', parsed);
                } catch {
                  // Allow typing invalid JSON temporarily
                }
              }}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder={`[{"operator": "AND", "rules": [{"field": "qualityScore", "operator": ">=", "value": 70}]}]`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported operators: ==, !=, &gt;, &lt;, &gt;=, &lt;=, contains, starts_with
            </p>
          </div>
        );

      case 'log-event':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <input
              type="text"
              value={config.eventType || ''}
              onChange={(e) => updateField('eventType', e.target.value)}
              placeholder="workflow_step_executed"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        );

      case 'update-metrics':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metrics (JSON)</label>
            <textarea
              value={config.metrics ? JSON.stringify(config.metrics, null, 2) : ''}
              onChange={(e) => {
                try {
                  updateField('metrics', JSON.parse(e.target.value));
                } catch {
                  // Allow typing
                }
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder={`{"processed": true, "score": 85}`}
            />
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">No configuration options for this action type.</p>;
    }
  };

  return (
    <div className="bg-white border-l border-gray-200 w-96 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-gray-500" />
          <h3 className="font-semibold text-sm">Configure Step</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close panel">
          <X size={16} className="text-gray-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${actionMeta?.color || 'bg-gray-100'}`}>
            {actionMeta && React.createElement(actionMeta.icon, { size: 14 })}
            {actionMeta?.label || step.actionType}
          </div>
        </div>
        <div className="space-y-4">
          {renderConfigFields()}
        </div>
      </div>
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ─── Helpers: Convert steps ↔ React Flow nodes/edges ───────────────────────

const VERTICAL_GAP = 120;
const HORIZONTAL_GAP = 300;

function stepsToNodesAndEdges(
  steps: StepNode[],
  triggerType: string,
  selectedStepId: string | null,
  onDeleteStep: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const sorted = [...steps].sort((a, b) => a.order - b.order);

  // Trigger node at the top
  nodes.push({
    id: 'trigger',
    type: 'trigger',
    position: { x: 300, y: 0 },
    data: { triggerType },
    draggable: true,
  });

  // Build a map from step id → step for quick lookup
  const stepMap = new Map(sorted.map((s) => [s.id, s]));

  // Position nodes vertically, branching condition nodes horizontally
  const positioned = new Set<string>();
  let currentY = VERTICAL_GAP;

  function positionStep(stepId: string, x: number, y: number): number {
    if (positioned.has(stepId)) return y;
    const step = stepMap.get(stepId);
    if (!step) return y;
    positioned.add(stepId);

    nodes.push({
      id: step.id,
      type: 'action',
      position: { x, y },
      data: {
        actionType: step.actionType,
        config: step.config,
        isEnabled: step.isEnabled,
        isSelected: selectedStepId === step.id,
        stepId: step.id,
        onDelete: onDeleteStep,
      },
      draggable: true,
    });

    let maxY = y;

    if (step.actionType === 'condition-check') {
      // Branch: success goes left, failure goes right
      if (step.nextStepOnSuccess && stepMap.has(step.nextStepOnSuccess)) {
        edges.push({
          id: `${step.id}-success`,
          source: step.id,
          target: step.nextStepOnSuccess,
          sourceHandle: 'success',
          label: 'Yes',
          style: { stroke: '#22c55e', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
          animated: true,
        });
        const successY = positionStep(step.nextStepOnSuccess, x - HORIZONTAL_GAP / 2, y + VERTICAL_GAP);
        maxY = Math.max(maxY, successY);
      }
      if (step.nextStepOnFailure && stepMap.has(step.nextStepOnFailure)) {
        edges.push({
          id: `${step.id}-failure`,
          source: step.id,
          target: step.nextStepOnFailure,
          sourceHandle: 'failure',
          label: 'No',
          style: { stroke: '#ef4444', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          animated: true,
        });
        const failureY = positionStep(step.nextStepOnFailure, x + HORIZONTAL_GAP / 2, y + VERTICAL_GAP);
        maxY = Math.max(maxY, failureY);
      }
    } else {
      // Linear: next step by order (or explicit nextStepOnSuccess)
      const nextId = step.nextStepOnSuccess;
      if (nextId && stepMap.has(nextId)) {
        edges.push({
          id: `${step.id}-next`,
          source: step.id,
          target: nextId,
          style: { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        });
      }
    }

    return maxY;
  }

  // Walk steps in order, positioning any not yet placed
  for (const step of sorted) {
    if (!positioned.has(step.id)) {
      currentY = positionStep(step.id, 300, currentY) + VERTICAL_GAP;
    }
  }

  // Connect trigger → first step
  if (sorted.length > 0) {
    edges.push({
      id: 'trigger-to-first',
      source: 'trigger',
      target: sorted[0].id,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    });
  }

  // Add edges from steps that don't have explicit next to the following step by order
  for (let i = 0; i < sorted.length - 1; i++) {
    const step = sorted[i];
    if (step.actionType === 'condition-check') continue; // handled above
    const hasExplicitNext = edges.some((e) => e.source === step.id);
    if (!hasExplicitNext) {
      edges.push({
        id: `${step.id}-to-${sorted[i + 1].id}`,
        source: step.id,
        target: sorted[i + 1].id,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      });
    }
  }

  // End node
  const endY = currentY;
  nodes.push({
    id: 'end',
    type: 'end',
    position: { x: 300, y: endY },
    data: {},
    draggable: true,
  });

  // Connect last step(s) to end  (any step with no outgoing edge)
  const stepsWithOutgoing = new Set(edges.map((e) => e.source));
  for (const step of sorted) {
    if (!stepsWithOutgoing.has(step.id)) {
      edges.push({
        id: `${step.id}-to-end`,
        source: step.id,
        target: 'end',
        style: { stroke: '#6b7280', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      });
    }
  }

  // If no steps, connect trigger → end
  if (sorted.length === 0) {
    edges.push({
      id: 'trigger-to-end',
      source: 'trigger',
      target: 'end',
      style: { stroke: '#6b7280', strokeWidth: 2, strokeDasharray: '6 3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    });
  }

  return { nodes, edges };
}

export function WorkflowBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflowById(id || '');
  const addStep = useAddWorkflowStep(id || '');
  const deleteStep = useDeleteWorkflowStep(id || '');

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showActionPalette, setShowActionPalette] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localSteps, setLocalSteps] = useState<StepNode[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync steps from server
  useEffect(() => {
    if (workflow?.steps && !initialized) {
      setLocalSteps(
        workflow.steps.map((s) => ({
          id: s.id,
          order: s.order,
          actionType: s.actionType,
          config: s.config || {},
          isEnabled: s.isEnabled,
          nextStepOnSuccess: s.nextStepOnSuccess,
          nextStepOnFailure: s.nextStepOnFailure,
          conditions: s.conditions,
        }))
      );
      setInitialized(true);
    }
  }, [workflow, initialized]);

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      if (!confirm('Delete this step?')) return;
      try {
        await deleteStep.mutateAsync(stepId);
        setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
        setSelectedStepId((prev) => (prev === stepId ? null : prev));
      } catch (error) {
        console.error('Failed to delete step:', error);
      }
    },
    [deleteStep]
  );

  // Rebuild graph when steps change
  useEffect(() => {
    const triggerType = workflow?.triggerConfig?.type
      ? workflow.triggerConfig.type.replace(/_/g, ' ')
      : 'Manual';
    const { nodes: n, edges: e } = stepsToNodesAndEdges(
      localSteps,
      triggerType,
      selectedStepId,
      handleDeleteStep,
    );
    setNodes(n);
    setEdges(e);
  }, [localSteps, selectedStepId, workflow?.triggerConfig, handleDeleteStep]);

  const selectedStep = useMemo(
    () => localSteps.find((s) => s.id === selectedStepId) || null,
    [localSteps, selectedStepId]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'action') {
      setSelectedStepId((node.data as any).stepId);
    } else {
      setSelectedStepId(null);
    }
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const isSuccessBranch = connection.sourceHandle === 'success';
      const isFailureBranch = connection.sourceHandle === 'failure';

      if (isSuccessBranch || isFailureBranch) {
        // Update step branching
        setLocalSteps((prev) =>
          prev.map((s) => {
            if (s.id === connection.source) {
              return isSuccessBranch
                ? { ...s, nextStepOnSuccess: connection.target ?? undefined }
                : { ...s, nextStepOnFailure: connection.target ?? undefined };
            }
            return s;
          })
        );
        setHasUnsavedChanges(true);
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            style: {
              stroke: isSuccessBranch ? '#22c55e' : isFailureBranch ? '#ef4444' : '#6366f1',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isSuccessBranch ? '#22c55e' : isFailureBranch ? '#ef4444' : '#6366f1',
            },
            animated: isSuccessBranch || isFailureBranch,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleAddStep = async (actionType: string) => {
    try {
      await addStep.mutateAsync({
        order: localSteps.length,
        actionType,
        isEnabled: true,
      });
      setShowActionPalette(false);
      setInitialized(false); // Re-sync from server
    } catch (error) {
      console.error('Failed to add step:', error);
    }
  };

  const handleUpdateStepConfig = useCallback(
    (config: Record<string, any>) => {
      if (!selectedStepId) return;
      setLocalSteps((prev) =>
        prev.map((s) => (s.id === selectedStepId ? { ...s, config } : s))
      );
      setHasUnsavedChanges(true);
    },
    [selectedStepId]
  );

  const handleSaveAll = async () => {
    if (!id) return;
    try {
      for (const step of localSteps) {
        const original = workflow?.steps?.find((s) => s.id === step.id);
        if (original && JSON.stringify(original.config) !== JSON.stringify(step.config)) {
          await fetch(`/api/v1/workflows/${id}/steps/${step.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('lf-access-token')}`,
            },
            body: JSON.stringify({ config: step.config }),
          });
        }
      }
      setHasUnsavedChanges(false);
      setInitialized(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!workflow) return <div className="p-8 text-center">Workflow not found</div>;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Builder Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/workflows/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-lg font-bold">{workflow.name}</h1>
            <p className="text-xs text-gray-500">Visual Workflow Builder — DAG Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      {/* Builder Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={2}
            defaultEdgeOptions={{
              style: { stroke: '#6366f1', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            }}
          >
            <Controls position="bottom-left" />
            <MiniMap
              nodeStrokeColor="#6366f1"
              nodeColor={(n) => {
                if (n.type === 'trigger') return '#6366f1';
                if (n.type === 'end') return '#1f2937';
                return '#ffffff';
              }}
              maskColor="rgba(99, 102, 241, 0.08)"
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />

            {/* Floating Add Step Button */}
            <Panel position="top-right">
              <button
                onClick={() => setShowActionPalette(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                <Plus size={16} className="text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Add Step</span>
              </button>
            </Panel>
          </ReactFlow>
        </div>

        {/* Action Palette Modal */}
        {showActionPalette && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add workflow step">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="font-bold text-lg">Add Step</h3>
                <button
                  onClick={() => setShowActionPalette(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {ACTION_CATEGORIES.map((category) => {
                  const actions = ALL_ACTION_TYPES.filter((a) => a.category === category);
                  if (actions.length === 0) return null;

                  return (
                    <div key={category} className="mb-6">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {actions.map((action) => (
                          <button
                            key={action.value}
                            onClick={() => handleAddStep(action.value)}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left hover:shadow-sm transition-shadow ${action.color}`}
                          >
                            <action.icon size={18} />
                            <span className="font-medium text-sm">{action.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Config Panel */}
        {selectedStep && (
          <ActionConfigPanel
            step={selectedStep}
            onUpdate={handleUpdateStepConfig}
            onClose={() => setSelectedStepId(null)}
          />
        )}
      </div>
    </div>
  );
}
