import { useState } from 'react';
import { useLeads } from '../api/leads';
import { useLeadScoringReport } from '../api/ai';
import { Flame, AlertTriangle, TrendingUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';

export function LeadRecommendationsWidget() {
  const { data: leads, isLoading: leadsLoading } = useLeads({});
  const { data: report, isLoading: reportLoading } = useLeadScoringReport();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (leadsLoading || reportLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center min-h-[200px]">
        <LoadingSpinner message="Loading recommendations..." />
      </div>
    );
  }

  if (!leads?.data || leads.data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600 italic text-sm">No leads to recommend yet</p>
        <p className="text-xs text-gray-600 mt-2">Check back when leads arrive</p>
      </div>
    );
  }

  // Categorize leads
  const hotLeads = (leads.data || [])
    .filter((lead: any) => (lead as any).qualityScore && (lead as any).qualityScore >= 80)
    .sort((a: any, b: any) => ((b as any).qualityScore || 0) - ((a as any).qualityScore || 0))
    .slice(0, 5);

  const expiringLeads = (leads.data || [])
    .filter((lead: any) => {
      const ageHours = (Date.now() - new Date((lead as any).receivedAt).getTime()) / (1000 * 60 * 60);
      return ageHours < 48 && ageHours > 0 && (lead as any).qualityScore && (lead as any).qualityScore >= 70;
    })
    .sort((a: any, b: any) => new Date((b as any).receivedAt).getTime() - new Date((a as any).receivedAt).getTime())
    .slice(0, 5);

  const riskLeads = (leads.data || [])
    .filter((lead: any) => {
      const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const email = (lead as any).email?.toLowerCase() || '';
      return !email || !email.includes('@') || genericDomains.some((d) => email.endsWith(d));
    })
    .slice(0, 5);

  const newHighScoring = (leads.data || [])
    .filter((lead: any) => {
      const ageHours = (Date.now() - new Date((lead as any).receivedAt).getTime()) / (1000 * 60 * 60);
      return ageHours < 24 && (lead as any).qualityScore && (lead as any).qualityScore >= 75;
    })
    .sort((a: any, b: any) => new Date((b as any).receivedAt).getTime() - new Date((a as any).receivedAt).getTime())
    .slice(0, 5);

  const Section = ({
    title,
    icon: Icon,
    count,
    color,
    leads: sectionLeads,
    sectionId,
  }: {
    title: string;
    icon: any;
    count: number;
    color: string;
    leads: any[];
    sectionId: string;
  }) => {
    const isExpanded = expandedSection === sectionId;
    return (
    <div className="border-b border-gray-50 last:border-b-0">
      <button
        onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
            <Icon size={16} className={color} />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
            <p className="text-xs text-gray-400">{count} lead{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-gray-600 bg-gray-100">
            {count}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 py-3 space-y-2">
          {sectionLeads.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">No leads in this category</p>
          ) : (
            sectionLeads.map((lead: any) => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-150"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{lead.email || '—'}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {lead.qualityScore && (
                    <span className="text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                      {lead.qualityScore}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {Math.floor((Date.now() - new Date(lead.receivedAt).getTime()) / (1000 * 60))}m ago
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Lead Recommendations</h3>
        </div>
        <div>
          <Section
            title="Hot Leads Needing Action"
            icon={Flame}
            count={hotLeads.length}
            color="text-red-500"
            leads={hotLeads}
            sectionId="hot"
          />
          <Section
            title="Leads Expiring Soon (48h)"
            icon={AlertTriangle}
            count={expiringLeads.length}
            color="text-amber-500"
            leads={expiringLeads}
            sectionId="expiring"
          />
          <Section
            title="High-Risk Leads"
            icon={AlertTriangle}
            count={riskLeads.length}
            color="text-orange-500"
            leads={riskLeads}
            sectionId="risk"
          />
          <Section
            title="New High-Scoring (24h)"
            icon={TrendingUp}
            count={newHighScoring.length}
            color="text-green-500"
            leads={newHighScoring}
            sectionId="new"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">Quick Stats</h3>

        <div className="space-y-3">
          <div className="rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Hot Leads</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{hotLeads.length}</p>
            <p className="text-xs text-gray-400 mt-1">Ready to contact immediately</p>
          </div>

          <div className="rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Conversion Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {report?.conversionByTier.hot
                ? `${Math.round((report.conversionByTier.hot as any) * 100)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Hot leads expected conversion</p>
          </div>

          <div className="rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{report?.totalLeads || 0}</p>
            <p className="text-xs text-gray-400 mt-1">
              {report?.scoreDistribution.hot || 0} hot, {report?.scoreDistribution.warm || 0} warm
            </p>
          </div>

          <div className="rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Avg Lead Score</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{report?.averageScores.overall || 0}/100</p>
            <p className="text-xs text-gray-400 mt-1">Across all dimensions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
