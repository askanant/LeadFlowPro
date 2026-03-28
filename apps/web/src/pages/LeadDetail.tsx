import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, TrendingUp, Mail, Phone, Briefcase, Building2, CheckCircle2, XCircle, Clock, UserCheck, CalendarClock, ShieldAlert } from 'lucide-react';
import { useLead, useUpdateLeadStatus } from '../api/leads';
import { useLeadAIInsights, useChurnRisk, useRoutingRecommendation, useBestContactTime } from '../api/ai';
import { useLeadActivities } from '../api/tasks';
import type { ActivityItem } from '../api/tasks';
import { Badge } from '../components/Badge';
import { LeadIntelligenceCard } from '../components/LeadIntelligenceCard';
import { LoadingSpinner } from '../components/LoadingSpinner';

const STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'converted'];

type Tab = 'overview' | 'insights' | 'activity';

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: lead, isLoading } = useLead(id!);
  const { scoring, prediction, enrichment, isLoading: insightsLoading } = useLeadAIInsights(id!);
  const { data: churnRisk } = useChurnRisk(id!);
  const { data: routing } = useRoutingRecommendation(id!);
  const { data: contactTime } = useBestContactTime(id!);
  const updateStatus = useUpdateLeadStatus();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Lead not found</p>
        <Link to="/leads" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/leads" className="text-gray-600 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown Lead'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge label={lead.platform} />
            <Badge label={lead.status} />
            {lead.qualityScore != null && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Score: {lead.qualityScore}/100
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'insights'}
            onClick={() => setActiveTab('insights')}
            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'insights'
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <TrendingUp size={16} />
            Intelligence & Insights
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Clock size={16} />
            Activity Timeline
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus.mutate({ id: id!, status: e.target.value })}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  ['First Name', lead.firstName],
                  ['Last Name', lead.lastName],
                  ['Email', lead.email],
                  ['Phone', lead.phone],
                  ['City', lead.city],
                  ['State', lead.state],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-600">{label}</dt>
                    <dd className="text-sm text-gray-900 font-medium mt-0.5">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Custom Fields */}
            {lead.customFields && Object.keys(lead.customFields).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Custom Fields</h2>
                <dl className="grid grid-cols-2 gap-3">
                  {Object.entries(lead.customFields).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs text-gray-600 capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd className="text-sm text-gray-900 mt-0.5">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Audit Log */}
            {lead.auditLogs?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity Log</h2>
                <div className="space-y-3">
                  {lead.auditLogs.map((log, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                        {log.note && <span className="text-gray-500"> — {log.note}</span>}
                        <div className="text-xs text-gray-600 mt-0.5">
                          {log.actor} · {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Deliveries */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Deliveries</h2>
              {lead.deliveries?.length === 0 ? (
                <p className="text-xs text-gray-600">No deliveries yet</p>
              ) : (
                <div className="space-y-2">
                  {lead.deliveries?.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900 capitalize">{d.channel}</span>
                        {d.deliveredAt && (
                          <div className="text-xs text-gray-600">{new Date(d.deliveredAt).toLocaleString()}</div>
                        )}
                      </div>
                      <Badge label={d.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meta info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Details</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-600">Lead ID</dt>
                  <dd className="text-gray-700 font-mono text-xs break-all">{lead.id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Platform Lead ID</dt>
                  <dd className="text-gray-700 font-mono text-xs break-all">{(lead as any).platformLeadId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Received</dt>
                  <dd className="text-gray-700">{new Date(lead.receivedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Campaign</dt>
                  <dd className="text-gray-700">{(lead as any).campaign?.name ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {insightsLoading ? (
            <LoadingSpinner message="Loading AI insights..." />
          ) : scoring?.data ? (
            <>
              {/* Intelligence Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <LeadIntelligenceCard
                    scoring={scoring.data}
                    prediction={prediction.data}
                  />
                </div>

                {/* Risk Factors & Recommendations */}
                <div className="space-y-5">
                  {/* Risk Assessment */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={18} className={scoring.data.riskScore >= 80 ? 'text-green-600' : scoring.data.riskScore >= 60 ? 'text-yellow-600' : 'text-red-600'} />
                      <h3 className="text-sm font-semibold text-gray-900">Risk Assessment</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600 font-medium">Safety Score</span>
                          <span className="text-sm font-bold text-gray-900">{scoring.data.riskScore}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                              scoring.data.riskScore >= 80
                                ? 'bg-green-600'
                                : scoring.data.riskScore >= 60
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${scoring.data.riskScore}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {scoring.data.riskScore >= 80
                          ? 'Low fraud risk'
                          : scoring.data.riskScore >= 60
                          ? 'Moderate fraud risk'
                          : 'High fraud risk'}
                      </p>
                    </div>
                  </div>

                  {/* Key Signals */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Signals</h3>
                    <ul className="space-y-2">
                      {scoring.data.signals.slice(0, 4).map((signal, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                          <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Actions */}
                  {scoring.data.recommendations.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommended Actions</h3>
                      <div className="space-y-2">
                        {scoring.data.recommendations.slice(0, 3).map((rec, idx) => (
                          <button
                            key={idx}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 btn-press ${
                              rec.priority === 'high'
                                ? 'bg-red-50 text-red-900 hover:bg-red-100 hover:shadow-sm'
                                : 'bg-gray-50 text-gray-900 hover:bg-gray-100 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="capitalize">{rec.action.replace(/_/g, ' ')}</span>
                              {rec.priority === 'high' && <span className="text-xs">!</span>}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrichment Data */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
                <h3 className="text-sm font-semibold text-gray-900 mb-5">Enrichment Data</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  <div className="flex items-start gap-3">
                    <Mail size={16} className={enrichment.data?.verifiedEmail ? 'text-green-600 mt-0.5' : 'text-gray-600 mt-0.5'} />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email Quality</p>
                      <div className="flex items-center gap-1.5">
                        {enrichment.data?.verifiedEmail
                          ? <CheckCircle2 size={14} className="text-green-600" />
                          : <XCircle size={14} className="text-red-400" />}
                        <p className="text-sm font-semibold text-gray-900">
                          {enrichment.data?.verifiedEmail ? 'Business Domain / Verified' : 'Personal / Unverified'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={16} className={enrichment.data?.phoneValid ? 'text-green-600 mt-0.5' : 'text-gray-600 mt-0.5'} />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Phone Valid</p>
                      <div className="flex items-center gap-1.5">
                        {enrichment.data?.phoneValid
                          ? <CheckCircle2 size={14} className="text-green-600" />
                          : <XCircle size={14} className="text-red-400" />}
                        <p className="text-sm font-semibold text-gray-900">
                          {enrichment.data?.phoneValid ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase size={16} className="text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Job Level</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {enrichment.data?.jobLevel ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 size={16} className="text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Company Size</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {enrichment.data?.companySize || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced AI — Sprint 23 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Churn Risk */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert size={18} className={
                      !churnRisk ? 'text-gray-400' :
                      churnRisk.riskLevel === 'critical' ? 'text-red-600' :
                      churnRisk.riskLevel === 'high' ? 'text-orange-600' :
                      churnRisk.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    } />
                    <h3 className="text-sm font-semibold text-gray-900">Churn Risk</h3>
                  </div>
                  {churnRisk ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-600 font-medium capitalize">{churnRisk.riskLevel} Risk</span>
                          <span className="text-sm font-bold text-gray-900">{churnRisk.churnRisk}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                              churnRisk.churnRisk >= 75 ? 'bg-red-600' :
                              churnRisk.churnRisk >= 50 ? 'bg-orange-500' :
                              churnRisk.churnRisk >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${churnRisk.churnRisk}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{churnRisk.recommendation}</p>
                      {churnRisk.factors.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${f.impact > 0 ? 'bg-red-400' : 'bg-green-400'}`} />
                          {f.detail}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Loading churn analysis...</p>
                  )}
                </div>

                {/* Routing Recommendation */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCheck size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Recommended Agent</h3>
                  </div>
                  {routing ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{routing.recommendedAgentName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Confidence</span>
                          <span className="text-xs font-bold text-indigo-600">{routing.confidence}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{routing.reason}</p>
                      {routing.alternatives.length > 0 && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1.5">Alternatives</p>
                          {routing.alternatives.slice(0, 2).map((alt) => (
                            <div key={alt.agentId} className="flex justify-between text-xs text-gray-600 py-0.5">
                              <span>{alt.agentName}</span>
                              <span className="font-medium">{alt.score}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Loading routing...</p>
                  )}
                </div>

                {/* Best Contact Time */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 card-hover">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarClock size={18} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Best Contact Times</h3>
                  </div>
                  {contactTime ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">{contactTime.timezone}</p>
                      {contactTime.bestTimes.slice(0, 4).map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{t.label}</span>
                          <span className={`text-xs font-bold ${
                            t.confidence >= 70 ? 'text-green-600' :
                            t.confidence >= 50 ? 'text-yellow-600' : 'text-gray-500'
                          }`}>
                            {t.confidence}%
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 pt-1">{contactTime.reasoning}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Loading contact times...</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <AlertTriangle size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600">Unable to load AI insights</p>
            </div>
          )}
        </div>
      )}

      {/* Activity Timeline Tab */}
      {activeTab === 'activity' && id && (
        <ActivityTimeline leadId={id} />
      )}
    </div>
  );
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  note: 'bg-blue-400',
  call: 'bg-green-400',
  email: 'bg-purple-400',
  status_change: 'bg-yellow-400',
  score_change: 'bg-orange-400',
  task_created: 'bg-indigo-400',
  workflow_run: 'bg-pink-400',
};

function ActivityTimeline({ leadId }: { leadId: string }) {
  const { data, isLoading } = useLeadActivities(leadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const activities = data?.data ?? [];

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Clock size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Activity Timeline</h2>
      <div className="space-y-4">
        {activities.map((activity: ActivityItem) => (
          <div key={activity.id} className="flex gap-3">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${ACTIVITY_TYPE_COLORS[activity.type] || 'bg-gray-400'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 capitalize px-1.5 py-0.5 bg-gray-100 rounded">
                  {activity.type.replace(/_/g, ' ')}
                </span>
                {activity.user && (
                  <span className="text-xs text-gray-500">
                    by {[activity.user.firstName, activity.user.lastName].filter(Boolean).join(' ') || activity.user.email}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-900 mt-1">{activity.summary}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
