import { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { useCreateCompany, useStoreCredentials } from '../api/companies';

type Platform = 'meta' | 'google' | 'linkedin' | 'microsoft' | 'taboola';

const PLATFORM_CONFIGS: Record<Platform, {
  name: string;
  icon: string;
  description: string;
  fields: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>;
}> = {
  meta: {
    name: 'Meta Ads',
    icon: 'M',
    description: 'Facebook, Instagram, Audience Network',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true, placeholder: '123456789' },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true, placeholder: '••••••••••' },
      { key: 'accountId', label: 'Ad Account ID', type: 'text', required: true, placeholder: 'act_123456789' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: '••••••••••' },
    ],
  },
  google: {
    name: 'Google Ads',
    icon: 'G',
    description: 'Search, Display, Shopping',
    fields: [
      { key: 'accountId', label: 'Customer ID', type: 'text', required: true, placeholder: '1234567890' },
      { key: 'accessToken', label: 'OAuth Access Token', type: 'password', required: true, placeholder: '••••••••••' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: false, placeholder: '••••••••••' },
      { key: 'appId', label: 'Developer Token', type: 'text', required: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  linkedin: {
    name: 'LinkedIn Ads',
    icon: 'in',
    description: 'LinkedIn feeds, sponsored content',
    fields: [
      { key: 'accountId', label: 'Ad Account ID', type: 'text', required: true, placeholder: '595111111' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: '••••••••••' },
      { key: 'appId', label: 'App ID', type: 'text', required: true, placeholder: 'xxxxxxxxx' },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true, placeholder: '••••••••••' },
    ],
  },
  microsoft: {
    name: 'Microsoft Ads',
    icon: 'Ms',
    description: 'Bing, Yahoo, AOL',
    fields: [
      { key: 'accountId', label: 'Customer ID', type: 'text', required: true, placeholder: '1234567890' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true, placeholder: '••••••••••' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: false, placeholder: '••••••••••' },
      { key: 'appId', label: 'Client ID', type: 'text', required: true, placeholder: 'xxxxxxxxxx' },
      { key: 'appSecret', label: 'Client Secret', type: 'password', required: true, placeholder: '••••••••••' },
    ],
  },
  taboola: {
    name: 'Taboola',
    icon: 'T',
    description: 'Native content discovery',
    fields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true, placeholder: 'your-account-id' },
      { key: 'accessToken', label: 'API Token', type: 'password', required: true, placeholder: '••••••••••' },
      { key: 'appId', label: 'Client ID', type: 'text', required: false, placeholder: 'optional' },
    ],
  },
};

interface PlatformSetup {
  platform: Platform;
  credentials: Record<string, string>;
}

export function AddCompanyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const createCompanyMutation = useCreateCompany();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [step, setStep] = useState<'details' | 'platforms' | 'credentials'>('details');
  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    industry: '',
    businessType: '',
    description: '',
    targetGeo: [] as string[],
    leadCriteria: '',
    pricingDetails: '',
    offerDetails: '',
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [platformSetups, setPlatformSetups] = useState<PlatformSetup[]>([]);
  const [currentPlatform, setCurrentPlatform] = useState<Platform | null>(null);
  const [currentCredentials, setCurrentCredentials] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddPlatform = (platform: Platform) => {
    if (!selectedPlatforms.includes(platform)) {
      setSelectedPlatforms([...selectedPlatforms, platform]);
      setCurrentPlatform(platform);
      setCurrentCredentials({});
    }
  };

  const handleRemovePlatform = (platform: Platform) => {
    setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    setPlatformSetups(platformSetups.filter((p) => p.platform !== platform));
    if (currentPlatform === platform) {
      setCurrentPlatform(null);
      setCurrentCredentials({});
    }
  };

  const handleSavePlatformCredentials = () => {
    if (!currentPlatform) return;

    const config = PLATFORM_CONFIGS[currentPlatform];
    const requiredFields = config.fields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !currentCredentials[f.key]?.trim());

    if (missingFields.length > 0) {
      setError(`Missing required fields: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    setPlatformSetups(
      platformSetups
        .filter((p) => p.platform !== currentPlatform)
        .concat([{ platform: currentPlatform, credentials: currentCredentials }])
    );
    setCurrentPlatform(null);
    setCurrentCredentials({});
    setError(null);
  };

  const handleSubmit = async () => {
    if (!companyDetails.name.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create company
      const companyRes = await createCompanyMutation.mutateAsync({
        name: companyDetails.name,
        industry: companyDetails.industry || undefined,
        businessType: companyDetails.businessType || undefined,
        description: companyDetails.description || undefined,
        targetGeo: companyDetails.targetGeo.length > 0 ? companyDetails.targetGeo : undefined,
        leadCriteria: companyDetails.leadCriteria ? JSON.parse(companyDetails.leadCriteria) : undefined,
        pricingDetails: companyDetails.pricingDetails ? JSON.parse(companyDetails.pricingDetails) : undefined,
        offerDetails: companyDetails.offerDetails || undefined,
      });

      const newTenantId = (companyRes.data as any).tenantId;

      // Store platform credentials
      for (const setup of platformSetups) {
        const credentialsMutation = useStoreCredentials(newTenantId);
        await credentialsMutation.mutateAsync({
          platform: setup.platform,
          accountId: setup.credentials.accountId,
          accessToken: setup.credentials.accessToken,
          refreshToken: setup.credentials.refreshToken,
          appId: setup.credentials.appId,
          appSecret: setup.credentials.appSecret,
        });
      }

      // Reset and close
      setCompanyDetails({
        name: '',
        industry: '',
        businessType: '',
        description: '',
        targetGeo: [],
        leadCriteria: '',
        pricingDetails: '',
        offerDetails: '',
      });
      setSelectedPlatforms([]);
      setPlatformSetups([]);
      setStep('details');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Add New Company">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New Company</h2>
            <p className="text-xs text-gray-500 mt-1">
              {step === 'details' && 'Enter company information'}
              {step === 'platforms' && 'Select ad platforms to integrate'}
              {step === 'credentials' && 'Configure platform credentials'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-red-800 font-medium text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Company Details */}
          {step === 'details' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={companyDetails.name}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                  placeholder="e.g., TechStartup Inc"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={companyDetails.industry}
                    onChange={(e) => setCompanyDetails({ ...companyDetails, industry: e.target.value })}
                    placeholder="e.g., SaaS"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                  <input
                    type="text"
                    value={companyDetails.businessType}
                    onChange={(e) => setCompanyDetails({ ...companyDetails, businessType: e.target.value })}
                    placeholder="e.g., B2B"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={companyDetails.description}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, description: e.target.value })}
                  placeholder="Brief description of the company and services"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Offer Details</label>
                <input
                  type="text"
                  value={companyDetails.offerDetails}
                  onChange={(e) => setCompanyDetails({ ...companyDetails, offerDetails: e.target.value })}
                  placeholder="e.g., Free trial, 30% discount"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Platform Selection */}
          {step === 'platforms' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-4">Select ad platforms to integrate</p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(PLATFORM_CONFIGS) as Platform[]).map((platform) => {
                    const config = PLATFORM_CONFIGS[platform];
                    const isSelected = selectedPlatforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        onClick={() =>
                          isSelected ? handleRemovePlatform(platform) : handleAddPlatform(platform)
                        }
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-lg mb-1">{config.icon}</div>
                            <p
                              className={`text-xs font-semibold ${
                                isSelected ? 'text-indigo-900' : 'text-gray-900'
                              }`}
                            >
                              {config.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Check size={12} className="text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedPlatforms.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-xs text-indigo-700">
                    {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Credentials */}
          {step === 'credentials' && (
            <div className="space-y-5">
              {selectedPlatforms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No platforms selected</p>
                </div>
              ) : (
                <>
                  {/* Configured platforms */}
                  {platformSetups.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Configured Platforms</p>
                      <div className="space-y-2">
                        {platformSetups.map((setup) => (
                          <div
                            key={setup.platform}
                            className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{PLATFORM_CONFIGS[setup.platform].icon}</span>
                              <div>
                                <p className="text-sm font-medium text-green-900">
                                  {PLATFORM_CONFIGS[setup.platform].name}
                                </p>
                                <p className="text-xs text-green-700">Credentials configured</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemovePlatform(setup.platform)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platform form */}
                  {currentPlatform && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{PLATFORM_CONFIGS[currentPlatform].icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">
                              {PLATFORM_CONFIGS[currentPlatform].name}
                            </p>
                            <p className="text-xs text-gray-500">Enter credentials below</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {PLATFORM_CONFIGS[currentPlatform].fields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {field.label} {field.required && '*'}
                            </label>
                            <input
                              type={field.type}
                              value={currentCredentials[field.key] || ''}
                              onChange={(e) =>
                                setCurrentCredentials({
                                  ...currentCredentials,
                                  [field.key]: e.target.value,
                                })
                              }
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSavePlatformCredentials}
                        className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Save Credentials
                      </button>
                    </div>
                  )}

                  {/* Platform selector */}
                  {!currentPlatform && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Add more platforms</p>
                      <div className="space-y-2">
                        {selectedPlatforms
                          .filter((p) => !platformSetups.find((s) => s.platform === p))
                          .map((platform) => (
                            <button
                              key={platform}
                              onClick={() => setCurrentPlatform(platform)}
                              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{PLATFORM_CONFIGS[platform].icon}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {PLATFORM_CONFIGS[platform].name}
                                </span>
                              </div>
                              <ChevronDown size={16} className="text-gray-600" />
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 sticky bottom-0 bg-white">
          {step !== 'details' && (
            <button
              onClick={() =>
                step === 'platforms'
                  ? setStep('details')
                  : setStep('platforms')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {step !== 'credentials' ? (
            <button
              onClick={() =>
                step === 'details' ? setStep('platforms') : setStep('credentials')
              }
              disabled={step === 'details' && !companyDetails.name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || platformSetups.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {saving ? 'Creating...' : 'Create Company'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
