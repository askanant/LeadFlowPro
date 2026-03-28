import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, AlertCircle, Download } from 'lucide-react';
import { useLeads } from '../api/leads';
import { Badge } from '../components/Badge';
import { exportToCSV, formatLeadsForCSV } from '../utils/csv';

const STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'converted', 'duplicate'];
const PLATFORMS = ['meta', 'google', 'linkedin', 'microsoft', 'taboola'];
const QUALITY_TIERS = [
  { label: 'Excellent (80+)', value: 'excellent', color: 'green' },
  { label: 'Good (60-79)', value: 'good', color: 'blue' },
  { label: 'Fair (40-59)', value: 'fair', color: 'yellow' },
  { label: 'Poor (0-39)', value: 'poor', color: 'red' },
];

export function Leads() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [quality, setQuality] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useLeads({ page, limit: 25, status: status || undefined, platform: platform || undefined, quality: quality || undefined, q: q || undefined });
  const leads = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{meta?.total ?? 0} total leads</p>
        </div>
        <button
          onClick={() => {
            if (leads.length > 0) exportToCSV(formatLeadsForCSV(leads), 'leads');
          }}
          disabled={leads.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
          title={leads.length === 0 ? 'No leads to export' : 'Download leads as CSV'}
        >
          <Download size={16} /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone..."
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white shadow-sm"
          />
          <button type="submit" aria-label="Search leads" className="px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 shadow-sm transition-colors">
            <Search size={14} />
          </button>
        </form>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={quality}
          onChange={(e) => { setQuality(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="">All Quality Tiers</option>
          {QUALITY_TIERS.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-2xl" />)}
        </div>
      ) : !leads.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Users size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">No leads found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-50 bg-gray-50/50">
                <tr>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Name</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Contact</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Platform</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Score</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Campaign</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <Link to={`/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      <div className="text-sm">{lead.email ?? ''}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{lead.phone ?? ''}</div>
                    </td>
                    <td className="px-5 py-4"><Badge label={lead.platform ?? 'Unknown'} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {lead.status === 'duplicate' && (
                          <span title="Duplicate lead">
                            <AlertCircle size={14} className="text-orange-500" aria-label="Duplicate lead" />
                          </span>
                        )}
                        <Badge label={lead.status ?? 'Unknown'} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.qualityScore != null ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  lead.qualityScore >= 80 ? 'bg-green-500' :
                                  lead.qualityScore >= 60 ? 'bg-blue-500' :
                                  lead.qualityScore >= 40 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${lead.qualityScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{lead.qualityScore}</span>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full w-fit" style={{
                            backgroundColor: lead.qualityScore >= 80 ? '#dcfce7' :
                                           lead.qualityScore >= 60 ? '#dbeafe' :
                                           lead.qualityScore >= 40 ? '#fef3c7' :
                                           '#fee2e2',
                            color: lead.qualityScore >= 80 ? '#166534' :
                                 lead.qualityScore >= 60 ? '#1e40af' :
                                 lead.qualityScore >= 40 ? '#92400e' :
                                 '#991b1b'
                          }}>
                            {lead.qualityScore >= 80 ? 'Excellent' :
                             lead.qualityScore >= 60 ? 'Good' :
                             lead.qualityScore >= 40 ? 'Fair' :
                             'Poor'}
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{(lead as any).campaign?.name ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-600 text-xs">
                      {new Date(lead.receivedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total > meta.limit && (
            <div className="flex items-center justify-between mt-5 text-sm text-gray-500">
              <span>Page {page} of {Math.ceil(meta.total / meta.limit)}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 shadow-sm text-sm font-medium transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(meta.total / meta.limit)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 shadow-sm text-sm font-medium transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
