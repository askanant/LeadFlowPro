import { useState } from 'react';
import { ArrowLeft, Play, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCampaigns } from '../api/campaigns';
import { useBulkScoreCampaign, useLeadScoringReport } from '../api/ai';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function BulkScoringDashboard() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: report, isLoading: reportLoading } = useLeadScoringReport();
  const bulkScore = useBulkScoreCampaign();
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleBulkScore = async () => {
    if (!selectedCampaignId) return;
    setScoring(true);
    setResult(null);
    try {
      const res = await bulkScore.mutateAsync(selectedCampaignId);
      setResult(res);
    } finally {
      setScoring(false);
    }
  };

  if (campaignsLoading || reportLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner message="Loading campaigns..." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/dashboard" className="text-gray-600 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Lead Scoring</h1>
          <p className="text-gray-600">Batch score all leads in a campaign</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scoring Controller */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Select Campaign</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
              <select
                value={selectedCampaignId || ''}
                onChange={(e) => setSelectedCampaignId(e.target.value || null)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-150"
              >
                <option value="">— Choose a campaign —</option>
                {campaigns?.map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleBulkScore}
              disabled={!selectedCampaignId || scoring}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 btn-press shadow-sm hover:shadow-md"
            >
              <Play size={16} />
              {scoring ? 'Scoring...' : 'Start Bulk Scoring'}
            </button>

            {result && (
              <div className={`p-4 rounded-lg border animate-fade-in ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start gap-2">
                  {result.error ? (
                    <>
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">{result.error}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900">Scoring Complete</p>
                        <dl className="text-sm text-green-700 mt-2 space-y-1">
                          <div>
                            <dt className="font-medium">Total Leads:</dt>
                            <dd>{result.totalLeads}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Successfully Scored:</dt>
                            <dd>{result.completed}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">Errors:</dt>
                            <dd>{result.errors}</dd>
                          </div>
                        </dl>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Distribution */}
          {report && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={20} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">Current Scoring Distribution</h2>
              </div>

              <div className="space-y-4">
                {/* Tier Distribution */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Lead Tiers</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 card-hover">
                      <p className="text-xs text-red-600 font-medium">Hot Leads</p>
                      <p className="text-2xl font-bold text-red-900 tabular-nums">{report.scoreDistribution.hot}</p>
                      <p className="text-xs text-red-600 mt-1">
                        {Math.round((report.scoreDistribution.hot / report.totalLeads) * 100)}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 card-hover">
                      <p className="text-xs text-orange-600 font-medium">Warm Leads</p>
                      <p className="text-2xl font-bold text-orange-900 tabular-nums">{report.scoreDistribution.warm}</p>
                      <p className="text-xs text-orange-600 mt-1">
                        {Math.round((report.scoreDistribution.warm / report.totalLeads) * 100)}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 card-hover">
                      <p className="text-xs text-blue-600 font-medium">Cold Leads</p>
                      <p className="text-2xl font-bold text-blue-900 tabular-nums">{report.scoreDistribution.cold}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {Math.round((report.scoreDistribution.cold / report.totalLeads) * 100)}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 card-hover">
                      <p className="text-xs text-gray-600 font-medium">Junk Leads</p>
                      <p className="text-2xl font-bold text-gray-900 tabular-nums">{report.scoreDistribution.junk}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {Math.round((report.scoreDistribution.junk / report.totalLeads) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Average Scores */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Average Scores by Dimension</h3>
                  <div className="space-y-2">
                    {Object.entries(report.averageScores).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-sm font-bold text-gray-900">{Math.round(value as number)}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.round(value as number)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversion by Tier */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Expected Conversion by Tier</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Hot</p>
                      <p className="text-xl font-bold text-red-600 tabular-nums">
                        {Math.round((report.conversionByTier.hot as any) * 100)}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Warm</p>
                      <p className="text-xl font-bold text-orange-600 tabular-nums">
                        {Math.round((report.conversionByTier.warm as any) * 100)}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Cold</p>
                      <p className="text-xl font-bold text-blue-600 tabular-nums">
                        {Math.round((report.conversionByTier.cold as any) * 100)}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Junk</p>
                      <p className="text-xl font-bold text-gray-600 tabular-nums">
                        {Math.round((report.conversionByTier.junk as any) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Factors */}
          {report?.topFactors && report.topFactors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top Scoring Factors</h2>
              <div className="space-y-3">
                {report.topFactors.map((factor: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                      <span className="text-xs font-bold text-indigo-600">{factor.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${factor.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{factor.count} leads</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
