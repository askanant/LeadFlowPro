import { useState } from 'react';
import { FileSearch, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useAuditLogs, useAuditLogActions, useAuditLogResources } from '../api/audit';
import type { AuditLogEntry } from '../api/audit';
import { cn } from '../lib/cn';

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700',
  login_2fa: 'bg-blue-100 text-blue-700',
  register: 'bg-green-100 text-green-700',
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
};

function ActionBadge({ action }: { action: string }) {
  const baseAction = action.split('_')[0];
  const color = ACTION_COLORS[action] || ACTION_COLORS[baseAction] || 'bg-gray-100 text-gray-700';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', color)}>
      {action}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function userName(entry: AuditLogEntry) {
  if (!entry.user) return entry.userId ? 'Unknown user' : 'System';
  const name = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ');
  return name || entry.user.email;
}

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const limit = 25;

  const { data, isLoading } = useAuditLogs({
    page,
    limit,
    action: actionFilter || undefined,
    resource: resourceFilter || undefined,
  });
  const { data: actions = [] } = useAuditLogActions();
  const { data: resources = [] } = useAuditLogResources();

  const logs = data?.data ?? [];
  const meta = data?.meta;
  const hasFilters = !!(actionFilter || resourceFilter);

  function clearFilters() {
    setActionFilter('');
    setResourceFilter('');
    setPage(1);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Track all security-relevant actions across your organization</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
            showFilters
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <Filter size={14} />
          Filters
          {hasFilters && (
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          )}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resource</label>
            <select
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All resources</option>
              {resources.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600">User</th>
                <th className="px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 font-medium text-gray-600">Resource</th>
                <th className="px-4 py-3 font-medium text-gray-600">Resource ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileSearch size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{userName(log)}</td>
                    <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3 text-gray-600">{log.resource}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[160px]" title={log.resourceId || ''}>
                      {log.resourceId || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.ipAddress || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs text-gray-600">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
