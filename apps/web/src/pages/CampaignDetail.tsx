import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, Pause, Play, AlertCircle } from 'lucide-react';
import { useCampaign, useCampaignMetrics, useLaunchCampaign, usePauseCampaign, useActivateCampaign } from '../api/campaigns';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { Users, TrendingUp, DollarSign, Phone } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Inner component that uses hooks
function CampaignDetailContent({ id }: { id: string }) {
  const { data: campaign, isLoading, error: campaignError } = useCampaign(id);
  const { data: metrics, error: metricsError } = useCampaignMetrics(id);
  const launchMutation = useLaunchCampaign();
  const pauseMutation = usePauseCampaign();
  const activateMutation = useActivateCampaign();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (campaignError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error loading campaign</p>
            <p className="text-red-700 text-sm mt-1">{campaignError instanceof Error ? campaignError.message : 'Unknown error'}</p>
            <Link to="/campaigns" className="text-red-600 text-sm hover:underline mt-3 inline-block">← Back to Campaigns</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-gray-600 mb-3" size={32} />
        <p className="text-gray-500 font-medium">Campaign not found</p>
        <p className="text-gray-600 text-sm mt-1">This campaign may have been deleted or you don't have access to it.</p>
        <Link to="/campaigns" className="text-indigo-600 text-sm hover:underline mt-4 inline-block">← Back to Campaigns</Link>
      </div>
    );
  }

  const metricsData = Array.isArray(metrics) ? metrics : [];

  return (
    <div className="p-8">
      {(launchMutation.error || pauseMutation.error || activateMutation.error) && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm mt-1">
              {launchMutation.error instanceof Error ? launchMutation.error.message :
               pauseMutation.error instanceof Error ? pauseMutation.error.message :
               activateMutation.error instanceof Error ? activateMutation.error.message :
               'An error occurred'}
            </p>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/campaigns" className="text-gray-600 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge label={campaign.platform} />
              <Badge label={campaign.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <button
              onClick={() => launchMutation.mutate(id)}
              disabled={launchMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Rocket size={15} /> {launchMutation.isPending ? 'Launching...' : `Launch on ${campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)}`}
            </button>
          )}
          {campaign.status === 'active' && (
            <button
              onClick={() => pauseMutation.mutate(id)}
              disabled={pauseMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm font-medium rounded-lg hover:bg-yellow-100 disabled:opacity-50 transition-colors"
            >
              <Pause size={15} /> Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              onClick={() => activateMutation.mutate(id)}
              disabled={activateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 text-sm font-medium rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              <Play size={15} /> Resume
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Daily Budget"
          value={campaign.dailyBudget ? `$${campaign.dailyBudget}` : '—'}
          icon={DollarSign}
        />
        <StatCard
          title="Total Budget"
          value={campaign.totalBudget ? `$${campaign.totalBudget}` : '—'}
          icon={DollarSign}
          color="text-green-600"
        />
        <StatCard
          title="Daily Lead Target"
          value={campaign.leadTargetDaily ?? '—'}
          icon={Users}
          color="text-indigo-600"
        />
        <StatCard
          title="Leads (all time)"
          value={(campaign as any)._count?.leads ?? 0}
          icon={TrendingUp}
          color="text-purple-600"
        />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Campaign Details</h2>
          <dl className="space-y-3">
            {[
              ['ID', campaign.id],
              ['Platform Campaign ID', (campaign as any).platformCampaignId ?? '—'],
              ['Start Date', campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : '—'],
              ['End Date', campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '—'],
              ['Created', new Date(campaign.createdAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-gray-900 font-medium text-right max-w-xs break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Metrics chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          {metricsError && (
            <div className="flex items-center gap-2 text-yellow-600 text-sm mb-4">
              <AlertCircle size={16} />
              <span>Error loading metrics</span>
            </div>
          )}
          {metricsData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
              <div className="text-center">
                <Phone size={24} className="mx-auto mb-2 opacity-30" />
                No metrics data yet
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// Outer component that handles route params
export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-gray-600 mb-3" size={32} />
        <p className="text-gray-500">Campaign ID is missing</p>
        <Link to="/campaigns" className="text-indigo-600 text-sm hover:underline mt-4 inline-block">← Back to Campaigns</Link>
      </div>
    );
  }

  return <CampaignDetailContent id={id} />;
}
