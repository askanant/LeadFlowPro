import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight, Check, Loader2, Building2, MapPin, Bell } from 'lucide-react';
import { useUpdateCompanyProfile, useUpdateIntegrations } from '../api/settings';
import { useAuthStore } from '../store/auth';

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Business Profile', icon: Building2, description: 'Tell us about your company' },
  { id: 2, title: 'Lead Targeting', icon: MapPin, description: 'Where are your customers?' },
  { id: 3, title: 'Notifications', icon: Bell, description: 'How should we deliver leads?' },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export function Setup() {
  const navigate = useNavigate();
  const setNeedsSetup = useAuthStore((s) => s.setNeedsSetup);
  const updateProfile = useUpdateCompanyProfile();
  const updateIntegrations = useUpdateIntegrations();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Business Profile
  const [profile, setProfile] = useState({
    industry: '',
    businessType: '',
    description: '',
  });

  // Step 2 — Lead Targeting
  const [targeting, setTargeting] = useState({
    country: 'India',
    statesRaw: '', // comma-separated
    citiesRaw: '', // comma-separated
  });

  // Step 3 — Notifications
  const [notifs, setNotifs] = useState({
    whatsappDeliveryNumber: '',
  });

  // ── helpers ──

  function toArray(raw: string): string[] {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handleNext() {
    setError('');
    setSaving(true);

    try {
      if (step === 1) {
        await updateProfile.mutateAsync({
          industry: profile.industry || null,
          businessType: profile.businessType || null,
          description: profile.description || null,
        });
        setStep(2);
      } else if (step === 2) {
        await updateProfile.mutateAsync({
          targetGeo: {
            country: targeting.country || undefined,
            states: toArray(targeting.statesRaw),
            cities: toArray(targeting.citiesRaw),
          },
        });
        setStep(3);
      } else if (step === 3) {
        if (notifs.whatsappDeliveryNumber) {
          await updateIntegrations.mutateAsync({
            whatsappDeliveryNumber: notifs.whatsappDeliveryNumber,
          });
        }
        // Setup complete
        setNeedsSetup(false);
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setNeedsSetup(false);
      navigate('/', { replace: true });
    }
  }

  // ── render ──

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="bg-indigo-600 text-white p-2 rounded-xl">
            <Zap size={20} />
          </div>
          <span className="text-xl font-bold text-gray-900">LeadFlow Pro</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    s.id < step
                      ? 'bg-indigo-600 text-white'
                      : s.id === step
                        ? 'bg-white border-2 border-indigo-600 text-indigo-600'
                        : 'bg-white border-2 border-gray-200 text-gray-600'
                  }`}
                >
                  {s.id < step ? <Check size={16} /> : s.id}
                </div>
                <span
                  className={`mt-1 text-xs font-medium whitespace-nowrap ${
                    s.id === step ? 'text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-12px] transition-colors ${
                    s.id < step ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Step header */}
          <div className="flex items-start gap-3 mb-6">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
              {(() => {
                const Icon = STEPS[step - 1]!.icon;
                return <Icon size={20} />;
              })()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{STEPS[step - 1]!.title}</h2>
              <p className="text-sm text-gray-500">{STEPS[step - 1]!.description}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* ── Step 1: Business Profile ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  value={profile.industry}
                  onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business type</label>
                <div className="flex gap-2 flex-wrap">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, businessType: bt }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        profile.businessType === bt
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company description{' '}
                  <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={profile.description}
                  onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of what your company does and the leads you're looking for..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Lead Targeting ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={targeting.country}
                  onChange={(e) => setTargeting((p) => ({ ...p, country: e.target.value }))}
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
                  value={targeting.statesRaw}
                  onChange={(e) => setTargeting((p) => ({ ...p, statesRaw: e.target.value }))}
                  placeholder="Maharashtra, Karnataka, Gujarat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cities{' '}
                  <span className="text-gray-600 font-normal">(comma-separated, optional)</span>
                </label>
                <input
                  type="text"
                  value={targeting.citiesRaw}
                  onChange={(e) => setTargeting((p) => ({ ...p, citiesRaw: e.target.value }))}
                  placeholder="Mumbai, Bengaluru, Pune"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <p className="text-xs text-gray-600">
                This helps configure Meta Ads targeting and filters leads by location. You can change
                it anytime in Settings.
              </p>
            </div>
          )}

          {/* ── Step 3: Notifications ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp delivery number{' '}
                  <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={notifs.whatsappDeliveryNumber}
                  onChange={(e) =>
                    setNotifs((p) => ({ ...p, whatsappDeliveryNumber: e.target.value }))
                  }
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-600">
                  New leads will be sent to this WhatsApp number via the LeadFlow template. Include
                  country code.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm font-medium text-indigo-800 mb-1">Almost done!</p>
                <p className="text-xs text-indigo-600">
                  You can always add Meta Ads credentials, Google Ads integration, and more from
                  the Settings page later.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-600 transition-colors"
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {step < 3 ? (
                <>
                  Next <ChevronRight size={15} />
                </>
              ) : (
                'Go to dashboard'
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
