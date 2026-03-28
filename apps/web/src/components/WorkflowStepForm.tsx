import { useState } from 'react';

interface WorkflowStep {
  actionType?: string;
}

interface WorkflowStepFormProps {
  step?: WorkflowStep;
  onSave?: (step: WorkflowStep) => void;
  onCancel?: () => void;
}

export function WorkflowStepForm({ step, onSave, onCancel }: WorkflowStepFormProps) {
  const [actionType, setActionType] = useState(step?.actionType ?? 'notify-agents');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Action type</label>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="notify-agents">Notify agents</option>
          <option value="create-task">Create task</option>
          <option value="send-email">Send email</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave?.({ actionType })}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
