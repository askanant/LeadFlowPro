import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';

export interface JsonViewerProps {
  data: any;
  label?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export function JsonViewer({ data, label, defaultExpanded = false, className }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const summary = useMemo(() => {
    if (data == null) return '—';
    if (typeof data === 'string') return data;
    try {
      const json = typeof data === 'string' ? JSON.parse(data) : data;
      return JSON.stringify(json, null, 2).slice(0, 200) + (JSON.stringify(json, null, 2).length > 200 ? '…' : '');
    } catch {
      return String(data);
    }
  }, [data]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      // ignore
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {label && <span className="text-sm font-medium">{label}</span>}
        </div>
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
        >
          <Copy size={14} /> Copy
        </button>
      </div>

      <div className="mt-2">
        {expanded ? (
          <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
            {formatted}
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded-lg overflow-hidden text-ellipsis">
            {summary}
          </pre>
        )}
      </div>
    </div>
  );
}
