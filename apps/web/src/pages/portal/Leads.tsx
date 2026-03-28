import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Search, Clock, Download } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { exportToCSV, formatLeadsForCSV } from '../../utils/csv';

const STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'converted'];

const MOCK_LEADS = [
  { id: 'l1', firstName: 'Vikash', lastName: 'Gupta', phone: '+919123456781', email: 'vikash@gmail.com', city: 'Mumbai', status: 'new', qualityScore: 85, campaign: 'Meta — Summer 2026', receivedAt: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: 'l2', firstName: 'Sunita', lastName: 'Yadav', phone: '+919234567891', email: 'sunita.y@outlook.com', city: 'Delhi', status: 'contacted', qualityScore: 72, campaign: 'Meta — Summer 2026', receivedAt: new Date(Date.now() - 32 * 60000).toISOString() },
  { id: 'l3', firstName: 'Rajesh', lastName: 'Verma', phone: '+919345678901', email: 'rajesh.v@yahoo.in', city: 'Pune', status: 'qualified', qualityScore: 91, campaign: 'Meta — North India', receivedAt: new Date(Date.now() - 65 * 60000).toISOString() },
  { id: 'l4', firstName: 'Meena', lastName: 'Joshi', phone: '+919456789012', email: 'meena.j@gmail.com', city: 'Bangalore', status: 'new', qualityScore: 68, campaign: 'Meta — Summer 2026', receivedAt: new Date(Date.now() - 125 * 60000).toISOString() },
  { id: 'l5', firstName: 'Arjun', lastName: 'Nair', phone: '+919567890123', email: 'arjun.nair@gmail.com', city: 'Chennai', status: 'contacted', qualityScore: 79, campaign: 'Meta — South India', receivedAt: new Date(Date.now() - 183 * 60000).toISOString() },
  { id: 'l6', firstName: 'Pooja', lastName: 'Mehta', phone: '+919678901234', email: 'pooja.m@gmail.com', city: 'Ahmedabad', status: 'new', qualityScore: 62, campaign: 'Meta — Summer 2026', receivedAt: new Date(Date.now() - 240 * 60000).toISOString() },
  { id: 'l7', firstName: 'Deepak', lastName: 'Tiwari', phone: '+919789012345', email: 'deepak.t@hotmail.com', city: 'Lucknow', status: 'disqualified', qualityScore: 34, campaign: 'Meta — North India', receivedAt: new Date(Date.now() - 320 * 60000).toISOString() },
  { id: 'l8', firstName: 'Aarti', lastName: 'Sharma', phone: '+919890123456', email: 'aarti.s@gmail.com', city: 'Jaipur', status: 'qualified', qualityScore: 88, campaign: 'Meta — Summer 2026', receivedAt: new Date(Date.now() - 400 * 60000).toISOString() },
  { id: 'l9', firstName: 'Ravi', lastName: 'Kumar', phone: '+919901234567', email: 'ravi.k@gmail.com', city: 'Hyderabad', status: 'converted', qualityScore: 95, campaign: 'Meta — South India', receivedAt: new Date(Date.now() - 480 * 60000).toISOString() },
  { id: 'l10', firstName: 'Kavita', lastName: 'Patel', phone: '+919012345678', email: 'kavita.p@yahoo.in', city: 'Surat', status: 'new', qualityScore: 71, campaign: 'Meta — Summer 2026', receivedAt: new Date(Date.now() - 520 * 60000).toISOString() },
];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export function PortalLeads() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const filtered = MOCK_LEADS.filter((l) => {
    if (status && l.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.firstName.toLowerCase().includes(q) &&
        !l.lastName.toLowerCase().includes(q) &&
        !l.phone.includes(q) &&
        !(l.email ?? '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const statusCounts = MOCK_LEADS.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const handleExport = () => {
    const formatted = formatLeadsForCSV(filtered);
    exportToCSV(formatted, "leads");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Lead Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">{MOCK_LEADS.length} total leads</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100/80 p-1 rounded-xl w-fit">
        <button
          onClick={() => setStatus('')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            status === '' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({MOCK_LEADS.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
              status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s} ({statusCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
        className="flex gap-2 mb-6"
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, phone, email..."
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white shadow-sm"
        />
        <button type="submit" className="px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 shadow-sm transition-colors">
          <Search size={14} />
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Clear
          </button>
        )}
      </form>

      {!filtered.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Inbox size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">No leads found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-50 bg-gray-50/50">
              <tr>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Lead</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Contact</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Location</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Score</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Campaign</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <Link
                      to={`/portal/leads/${lead.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {lead.firstName} {lead.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    <div className="text-sm">{lead.phone}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{lead.email}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{lead.city}</td>
                  <td className="px-5 py-4"><Badge label={lead.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lead.qualityScore >= 80 ? 'bg-green-500' :
                            lead.qualityScore >= 60 ? 'bg-blue-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${lead.qualityScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{lead.qualityScore}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">{lead.campaign}</td>
                  <td className="px-5 py-4 text-gray-600 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      {timeAgo(lead.receivedAt)}
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
