import React from 'react';
import { InboxIcon, FileTextIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className="py-8 px-4 text-center">
        <InboxIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 text-center">
      <div className="flex justify-center mb-4">
        {icon || <InboxIcon className="w-16 h-16 text-gray-500" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function EmptyTableState({
  title = 'No data found',
  description = 'Start by creating your first item',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={10} className="text-center py-12">
        <div className="flex flex-col items-center justify-center">
          <FileTextIcon className="w-12 h-12 text-gray-500 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </td>
    </tr>
  );
}
