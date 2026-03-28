import { useState, useEffect } from 'react';
import { Building2, Megaphone, Users, Settings2, X, RefreshCw, Copy, Eye, EyeOff, Plus } from 'lucide-react';
import { useCompanies } from '../api/companies';
import { Badge } from '../components/Badge';
import { AddCompanyModal } from '../components/AddCompanyModal';

interface ManageState {
  companyId: string;
  companyName: string;
  maxAgents: number;
  credentials: { email: string; password: string } | null;
  tab: 'settings' | 'credentials';
}

function ManageModal({ state, onClose }: { state: ManageState; onClose: () => void }) {
  const [tab, setTab] = useState<'settings' | 'credentials'>(state.tab);
  const [maxAgents, setMaxAgents] = useState(state.maxAgents);
  const [credentials, setCredentials] = useState(state.credentials);
  const [showPassword, setShowPassword] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerateCreds() {
    setGenerating(true);
    try {
      const response = await fetch(`/api/v1/companies/${state.companyId}/admin-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate credentials');
      }
      const data = await response.json();
      setCredentials(data.data);
      setTab('credentials');
    } catch (err) {
      console.error('Error generating credentials:', err);
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to generate credentials'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveSettings() {
    try {
      await fetch(`/api/v1/companies/${state.companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ settings: { maxAgents } }),
      });
      onClose();
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Manage Company">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Manage Company</h2>
            <p className="text-xs text-gray-500">{state.companyName}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100" role="tablist">
          {(['settings', 'credentials'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'settings' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Agent Slots
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxAgents}
                    onChange={(e) => setMaxAgents(Number(e.target.value))}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-600">Company can add up to this many agents</p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {tab === 'credentials' && (
            <div className="space-y-5">
              {credentials ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    Share these credentials securely. Password shown only once.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email / Username</label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm font-mono text-gray-800">{credentials.email}</span>
                      <button onClick={() => copy(credentials.email, 'email')} className="text-gray-600 hover:text-gray-600" aria-label="Copy email">
                        <Copy size={14} />
                      </button>
                      {copied === 'email' && <span className="text-xs text-green-600">Copied!</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm font-mono text-gray-800">
                        {showPassword ? credentials.password : '••••••••••••'}
                      </span>
                      <button onClick={() => setShowPassword((p) => !p)} className="text-gray-600 hover:text-gray-600" aria-label="Toggle password visibility">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => copy(credentials.password, 'pass')} className="text-gray-600 hover:text-gray-600" aria-label="Copy password">
                        <Copy size={14} />
                      </button>
                      {copied === 'pass' && <span className="text-xs text-green-600">Copied!</span>}
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateCreds}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                    Regenerate Credentials
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users size={20} className="text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No credentials yet</p>
                  <p className="text-xs text-gray-500 mb-5">
                    Generate a username + password for this company's admin to log in to their portal.
                  </p>
                  <button
                    onClick={handleGenerateCreds}
                    disabled={generating}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {generating ? 'Generating...' : 'Generate Credentials'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Companies() {
  const { data: companies, isLoading } = useCompanies();
  const [managing, setManaging] = useState<ManageState | null>(null);
  const [showAddCompany, setShowAddCompany] = useState(false);

  function openManage(company: any) {
    setManaging({
      companyId: company.id,
      companyName: company.name,
      maxAgents: company.settings?.maxAgents ?? 5,
      credentials: null,
      tab: 'settings',
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">Tenants using LeadFlow Pro</p>
        </div>
        <button
          onClick={() => setShowAddCompany(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Company
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
      ) : !companies?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Building2 size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">No companies found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-50 bg-gray-50/50">
              <tr>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Company</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Tenant ID</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Plan</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Campaigns</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Leads</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Max Agents</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
                <th scope="col" className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs uppercase">
                        {company.name[0]}
                      </div>
                      <span className="font-medium text-gray-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{company.tenantId.slice(0, 8)}...</td>
                  <td className="px-5 py-3.5 capitalize text-gray-600">{company.plan}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Megaphone size={13} className="text-gray-600" />
                      {company._count?.campaigns ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Users size={13} className="text-gray-600" />
                      {company._count?.leads ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {company.settings?.maxAgents ?? 5}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge label={company.isActive ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openManage(company)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-700 bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Settings2 size={13} />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {managing && <ManageModal state={managing} onClose={() => setManaging(null)} />}
      <AddCompanyModal isOpen={showAddCompany} onClose={() => setShowAddCompany(false)} />
    </div>
  );
}
