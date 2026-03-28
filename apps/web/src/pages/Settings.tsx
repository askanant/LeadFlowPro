import { useState, useEffect } from 'react';
import { Building2, Link2, Loader2, Check, AlertCircle, Save, RefreshCw, Shield } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { useCompanies } from '../api/companies';
import {
  useCompanyProfile,
  useUpdateCompanyProfile,
  useIntegrations,
  useUpdateIntegrations,
} from '../api/settings';
import { get2FAStatus, setup2FA, verify2FA, disable2FA } from '../api/auth';
import { cn } from '../lib/cn';

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type Tab = (typeof TABS)[number]['id'];

// ─── Company Profile Tab ──────────────────────────────────────────────────────

const INDUSTRIES = [
  'Real Estate',
  'Financial Services',
  'Insurance',
  'Healthcare',
  'Automotive',
  'Education',
  'Travel & Hospitality',
  'E-commerce',
  'SaaS / Technology',
  'Other',
];

const BUSINESS_TYPES = ['B2B', 'B2C', 'B2B2C', 'Marketplace'];

function CompanyTab({ tenantId }: { tenantId?: string }) {
  const { data: company, isLoading } = useCompanyProfile(tenantId);
  const updateProfile = useUpdateCompanyProfile(tenantId);

  const [form, setForm] = useState({
    name: '',
    industry: '',
    businessType: '',
    description: '',
    country: '',
    statesRaw: '',
    citiesRaw: '',
    maxAgents: 5,
  });
  const [saved, setSaved] = useState(false);

  // Populate form when data loads
  useEffect(() => {
    if (!company) return;
    const geo = company.targetGeo;
    setForm({
      name: company.name ?? '',
      industry: company.industry ?? '',
      businessType: company.businessType ?? '',
      description: company.description ?? '',
      country: geo?.country ?? '',
      statesRaw: geo?.states?.join(', ') ?? '',
      citiesRaw: geo?.cities?.join(', ') ?? '',
      maxAgents: Number((company.settings?.maxAgents as number) ?? 5),
    });
  }, [company]);

  function toArray(raw: string) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateProfile.mutateAsync({
      name: form.name || undefined,
      industry: form.industry || null,
      businessType: form.businessType || null,
      description: form.description || null,
      targetGeo: {
        country: form.country || undefined,
        states: toArray(form.statesRaw),
        cities: toArray(form.citiesRaw),
      },
      settings: { maxAgents: form.maxAgents },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {/* Company name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Max agent slots */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max agent slots</label>
        <input
          type="number"
          min={1}
          max={50}
          value={form.maxAgents}
          onChange={(e) => setForm((p) => ({ ...p, maxAgents: Number(e.target.value) }))}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-600">Company can add up to this many agents.</p>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
        <select
          value={form.industry}
          onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select industry...</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      {/* Business type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business type</label>
        <div className="flex gap-2 flex-wrap">
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt}
              type="button"
              onClick={() => setForm((p) => ({ ...p, businessType: bt }))}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                form.businessType === bt
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              )}
            >
              {bt}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Brief description of your company and the leads you're looking for..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Target geo */}
      <div className="border-t border-gray-100 pt-5">
        <p className="text-sm font-semibold text-gray-800 mb-4">Lead targeting geography</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              placeholder="India"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              States / regions{' '}
              <span className="text-gray-600 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.statesRaw}
              onChange={(e) => setForm((p) => ({ ...p, statesRaw: e.target.value }))}
              placeholder="Maharashtra, Karnataka, Gujarat"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cities <span className="text-gray-600 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={form.citiesRaw}
              onChange={(e) => setForm((p) => ({ ...p, citiesRaw: e.target.value }))}
              placeholder="Mumbai, Bengaluru, Pune"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {updateProfile.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          Save changes
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check size={14} /> Saved
          </span>
        )}
        {updateProfile.isError && (
          <span className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle size={14} /> Failed to save
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab({ tenantId }: { tenantId?: string }) {
  const { data: integrations, isLoading } = useIntegrations(tenantId);
  const updateIntegrations = useUpdateIntegrations(tenantId);

  const [whatsapp, setWhatsapp] = useState('');
  const [meta, setMeta] = useState({ accessToken: '', accountId: '', appId: '', appSecret: '' });
  const [savedSection, setSavedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!integrations) return;
    setWhatsapp(integrations.whatsapp.deliveryNumber ?? '');
    setMeta((p) => ({
      ...p,
      accountId: integrations.meta.accountId ?? '',
      appId: integrations.meta.appId ?? '',
    }));
  }, [integrations]);

  async function saveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    await updateIntegrations.mutateAsync({ whatsappDeliveryNumber: whatsapp || null });
    setSavedSection('whatsapp');
    setTimeout(() => setSavedSection(null), 2500);
  }

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault();
    await updateIntegrations.mutateAsync({
      meta: {
        ...(meta.accessToken && { accessToken: meta.accessToken }),
        ...(meta.accountId && { accountId: meta.accountId }),
        ...(meta.appId && { appId: meta.appId }),
        ...(meta.appSecret && { appSecret: meta.appSecret }),
      },
    });
    // Clear sensitive fields after save
    setMeta((p) => ({ ...p, accessToken: '', appSecret: '' }));
    setSavedSection('meta');
    setTimeout(() => setSavedSection(null), 2500);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── WhatsApp ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            W
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">WhatsApp Notifications</p>
            <p className="text-xs text-gray-500">Receive new leads via WhatsApp Business API</p>
          </div>
          {integrations?.whatsapp.configured && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <Check size={10} /> Connected
            </span>
          )}
        </div>
        <form onSubmit={saveWhatsapp} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery phone number
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-600">
              New leads will be delivered to this number. Include country code.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateIntegrations.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {updateIntegrations.isPending && savedSection === null && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Save
            </button>
            {savedSection === 'whatsapp' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* ── Meta Ads ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            f
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Meta Ads</p>
            <p className="text-xs text-gray-500">Connect Facebook / Instagram lead gen campaigns</p>
          </div>
          {integrations?.meta.connected && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <Check size={10} /> Connected
            </span>
          )}
        </div>
        <form onSubmit={saveMeta} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Account ID</label>
              <input
                type="text"
                value={meta.accountId}
                onChange={(e) => setMeta((p) => ({ ...p, accountId: e.target.value }))}
                placeholder="act_123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
              <input
                type="text"
                value={meta.appId}
                onChange={(e) => setMeta((p) => ({ ...p, appId: e.target.value }))}
                placeholder="1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token{' '}
              {integrations?.meta.hasAccessToken && (
                <span className="text-green-600 font-normal text-xs">● stored</span>
              )}
            </label>
            <input
              type="password"
              value={meta.accessToken}
              onChange={(e) => setMeta((p) => ({ ...p, accessToken: e.target.value }))}
              placeholder={
                integrations?.meta.hasAccessToken
                  ? 'Leave blank to keep existing token'
                  : 'Paste your access token'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Secret</label>
            <input
              type="password"
              value={meta.appSecret}
              onChange={(e) => setMeta((p) => ({ ...p, appSecret: e.target.value }))}
              placeholder="Leave blank to keep existing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-600">
              Used to verify incoming webhook signatures from Meta.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateIntegrations.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {updateIntegrations.isPending && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
            {savedSection === 'meta' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check size={14} /> Saved
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Security / 2FA Tab ────────────────────────────────────────────────────────

function SecurityTab() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get2FAStatus()
      .then((s) => setEnabled(s.enabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSetup() {
    setError('');
    setBusy(true);
    try {
      const data = await setup2FA();
      setSetupData(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Failed to set up 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verify2FA(code);
      setEnabled(true);
      setSetupData(null);
      setCode('');
      setSuccess('Two-factor authentication has been enabled.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await disable2FA(code);
      setEnabled(false);
      setCode('');
      setSuccess('Two-factor authentication has been disabled.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Shield size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
          </div>
          {enabled && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <Check size={10} /> Enabled
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <Check size={14} /> {success}
            </div>
          )}

          {!enabled && !setupData && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Use an authenticator app (Google Authenticator, Authy, etc.) to generate time-based codes for login.
              </p>
              <button
                onClick={handleSetup}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Set up 2FA
              </button>
            </div>
          )}

          {setupData && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Scan this QR code with your authenticator app, then enter the 6-digit code below to verify.
              </p>
              <div className="flex justify-center">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border border-gray-200" />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Manual entry key:</p>
                <code className="text-sm font-mono text-gray-800 break-all select-all">{setupData.secret}</code>
              </div>
              <form onSubmit={handleVerify} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Verify &amp; Enable
                </button>
              </form>
            </div>
          )}

          {enabled && (
            <form onSubmit={handleDisable} className="space-y-3">
              <p className="text-sm text-gray-600">
                Enter a code from your authenticator app to disable 2FA.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  Disable 2FA
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);

  // Default to current user's tenant when not set
  useEffect(() => {
    if (selectedTenantId) return;
    if (user?.tenantId) setSelectedTenantId(user.tenantId);
  }, [selectedTenantId, user?.tenantId]);

  // If super_admin, select first company when available (and none selected yet)
  useEffect(() => {
    if (selectedTenantId || user?.role !== 'super_admin') return;
    if (companies?.length) setSelectedTenantId(companies[0].tenantId);
  }, [companies, selectedTenantId, user?.role]);

  const tenantOptions = user?.role === 'super_admin' ? companies : [];

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your company profile and integrations</p>
        </div>

        {user?.role === 'super_admin' && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Tenant</label>
            <select
              value={selectedTenantId ?? ''}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              disabled={companiesLoading}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {tenantOptions.map((company) => (
                <option key={company.tenantId} value={company.tenantId}>
                  {company.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['settings', 'company', selectedTenantId ?? ''] });
                queryClient.invalidateQueries({ queryKey: ['settings', 'integrations', selectedTenantId ?? ''] });
              }}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              title="Refresh settings"
              aria-label="Refresh settings"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-8" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'company' && <CompanyTab tenantId={selectedTenantId} />}
      {activeTab === 'integrations' && <IntegrationsTab tenantId={selectedTenantId} />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  );
}
