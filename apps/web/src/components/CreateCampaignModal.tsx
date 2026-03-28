import { useState, useEffect } from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useCompanies } from '../api/companies';
import { useCreateCampaign, type CreateCampaignInput } from '../api/campaigns';
import { Button } from './Button';

const PLATFORM_INFO: Record<string, { name: string; icon: string; description: string }> = {
  meta: {
    name: 'Meta Ads',
    icon: 'M',
    description: 'Facebook, Instagram, Audience Network',
  },
  google: {
    name: 'Google Ads',
    icon: 'G',
    description: 'Search, Display, Shopping',
  },
  linkedin: {
    name: 'LinkedIn Ads',
    icon: 'in',
    description: 'LinkedIn feeds, sponsored content',
  },
  microsoft: {
    name: 'Microsoft Ads',
    icon: 'Ms',
    description: 'Bing, Yahoo, AOL',
  },
  taboola: {
    name: 'Taboola',
    icon: 'T',
    description: 'Native content discovery',
  },
};

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ isOpen, onClose }: CreateCampaignModalProps) {
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const createMutation = useCreateCampaign();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    dailyBudget: '',
    totalBudget: '',
    leadTargetDaily: '',
    startDate: '',
    endDate: '',
    audienceInsights: '',
    targetingConfig: {
      industries: [] as string[],
      interests: [] as string[],
      keywords: [] as string[],
      ageMin: 18,
      ageMax: 65,
      locations: [] as string[],
    },
    leadCriteria: {
      qualityScore: 70,
    },
  });

  const currentCompany = companies?.find((c) => c.tenantId === selectedCompany);
  const availablePlatforms = currentCompany?.adPlatformCredentials?.map((c) => c.platform) ?? [];

  const handleSelectPlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!selectedCompany) {
        setError('Please select a company');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedPlatforms.length === 0) {
        setError('Please select at least one platform');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep((prev) => (prev === 1 ? 1 : (prev - 1) as 1 | 2 | 3));
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    try {
      const payload: CreateCampaignInput = {
        tenantId: selectedCompany,
        name: formData.name,
        platforms: selectedPlatforms,
        dailyBudget: formData.dailyBudget ? Number(formData.dailyBudget) : undefined,
        totalBudget: formData.totalBudget ? Number(formData.totalBudget) : undefined,
        leadTargetDaily: formData.leadTargetDaily ? Number(formData.leadTargetDaily) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        targetingConfig: formData.targetingConfig,
        leadCriteria: formData.leadCriteria,
        audienceInsights: formData.audienceInsights || undefined,
      };

      await createMutation.mutateAsync(payload);
      onClose();
      // Reset form
      setStep(1);
      setSelectedCompany('');
      setSelectedPlatforms([]);
      setFormData({
        name: '',
        dailyBudget: '',
        totalBudget: '',
        leadTargetDaily: '',
        startDate: '',
        endDate: '',
        audienceInsights: '',
        targetingConfig: {
          industries: [],
          interests: [],
          keywords: [],
          ageMin: 18,
          ageMax: 65,
          locations: [],
        },
        leadCriteria: {
          qualityScore: 70,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Create New Campaign" className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Campaign</h2>
            <p className="text-xs text-gray-500 mt-1">
              Step {step} of 3: {step === 1 ? 'Select Company' : step === 2 ? 'Choose Platforms' : 'Campaign Details'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleCreate} className="p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Company Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Company
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {companiesLoading ? (
                    <div className="text-sm text-gray-500">Loading companies...</div>
                  ) : !companies?.length ? (
                    <div className="text-sm text-gray-500">No companies found. Create one first.</div>
                  ) : (
                    companies.map((company) => {
                      const hasCredentials =
                        (company.adPlatformCredentials?.length ?? 0) > 0;
                      const isSelected = selectedCompany === company.tenantId;

                      return (
                        <button
                          key={company.tenantId}
                          type="button"
                          onClick={() => {
                            setSelectedCompany(company.tenantId);
                            setSelectedPlatforms([]);
                          }}
                          disabled={!hasCredentials}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${!hasCredentials ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {company.name}
                                </span>
                                {isSelected && (
                                  <Check size={16} className="text-indigo-600" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-2">
                                {company.description || 'No description'}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {hasCredentials ? (
                                  company.adPlatformCredentials?.map((cred) => (
                                    <span
                                      key={cred.platform}
                                      className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200"
                                    >
                                      {PLATFORM_INFO[cred.platform]?.name || cred.platform}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-600 italic">
                                    No platforms configured
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Platform Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Platforms to Run Campaign
                </label>
                <p className="text-xs text-gray-500 mb-4">
                  Choose one or more platforms from {currentCompany?.name}'s configured platforms
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {availablePlatforms.map((platform) => {
                    const info = PLATFORM_INFO[platform];
                    const isSelected = selectedPlatforms.includes(platform);

                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => handleSelectPlatform(platform)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-2xl mb-1">{info?.icon}</div>
                            <p className={`text-sm font-semibold mb-1 ${
                              isSelected ? 'text-indigo-900' : 'text-gray-900'
                            }`}>
                              {info?.name || platform}
                            </p>
                            <p className="text-xs text-gray-500">
                              {info?.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={18} className="text-indigo-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {availablePlatforms.length === 0 && (
                  <div className="text-sm text-gray-500 italic">
                    This company has no configured platforms.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Campaign Details */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Lead Gen 2025"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Budget
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.dailyBudget}
                      onChange={(e) =>
                        setFormData({ ...formData, dailyBudget: e.target.value })
                      }
                      placeholder="50"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Budget
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.totalBudget}
                      onChange={(e) =>
                        setFormData({ ...formData, totalBudget: e.target.value })
                      }
                      placeholder="500"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Target/Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.leadTargetDaily}
                    onChange={(e) =>
                      setFormData({ ...formData, leadTargetDaily: e.target.value })
                    }
                    placeholder="10"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Targeting</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Industries (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.targetingConfig.industries.join(', ')}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingConfig: {
                            ...formData.targetingConfig,
                            industries: e.target.value
                              .split(',')
                              .map((i) => i.trim())
                              .filter((i) => i),
                          },
                        })
                      }
                      placeholder="e.g., Technology, Finance, Healthcare"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.targetingConfig.keywords.join(', ')}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetingConfig: {
                            ...formData.targetingConfig,
                            keywords: e.target.value
                              .split(',')
                              .map((k) => k.trim())
                              .filter((k) => k),
                          },
                        })
                      }
                      placeholder="e.g., software solutions, digital marketing"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Age Range: Min
                      </label>
                      <input
                        type="number"
                        min="13"
                        max="120"
                        value={formData.targetingConfig.ageMin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetingConfig: {
                              ...formData.targetingConfig,
                              ageMin: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Age Range: Max
                      </label>
                      <input
                        type="number"
                        min="13"
                        max="120"
                        value={formData.targetingConfig.ageMax}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            targetingConfig: {
                              ...formData.targetingConfig,
                              ageMax: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Audience Insights for AI Optimization</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Describe Your Target Audience (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Share insights about your ideal customers, their pain points, behaviors, or preferences. This helps our AI optimize the campaign strategy.
                  </p>
                  <textarea
                    value={formData.audienceInsights}
                    onChange={(e) =>
                      setFormData({ ...formData, audienceInsights: e.target.value })
                    }
                    placeholder="e.g., We're targeting mid-size tech companies with 50-500 employees. They're looking for cost-effective solutions, value ROI metrics, and have budget decisions made by CTOs and CFOs. They prefer case studies and technical demos."
                    rows={4}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Lead Quality</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Minimum Quality Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.leadCriteria.qualityScore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        leadCriteria: {
                          qualityScore: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Recommended: 60-80 for balanced lead quality
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Platforms:</strong> {selectedPlatforms.map((p) => PLATFORM_INFO[p]?.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending}
                  loadingText="Creating..."
                  disabled={!formData.name.trim()}
                  variant="primary" size="md" className="flex-1"
                >
                  Create Campaign
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
