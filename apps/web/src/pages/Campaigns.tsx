import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Megaphone, Rocket, Pause, Play, Download } from 'lucide-react';
import {
  useCampaigns,
  useLaunchCampaign,
  usePauseCampaign,
  useActivateCampaign,
} from '../api/campaigns';
import { Badge } from '../components/Badge';
import { CreateCampaignModal } from '../components/CreateCampaignModal';
import { exportToCSV, formatCampaignsForCSV } from '../utils/csv';

const PLATFORM_INFO: Record<string, { name: string; icon: string }> = {
  meta: {
    name: 'Meta Ads',
    icon: 'M',
  },
  google: {
    name: 'Google Ads',
    icon: 'G',
  },
  linkedin: {
    name: 'LinkedIn Ads',
    icon: 'in',
  },
  microsoft: {
    name: 'Microsoft Ads',
    icon: 'Ms',
  },
  taboola: {
    name: 'Taboola',
    icon: 'T',
  },
};

export function Campaigns() {
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: campaigns, isLoading } = useCampaigns({
    platform: platformFilter || undefined,
    status: statusFilter || undefined,
  });

  const launchMutation = useLaunchCampaign();
  const pauseMutation = usePauseCampaign();
  const activateMutation = useActivateCampaign();

  if (pauseMutation.error || activateMutation.error || launchMutation.error) {
    const error = pauseMutation.error || activateMutation.error || launchMutation.error;
    console.error('Campaign action error:', error);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your ad campaigns across platforms</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (campaigns && campaigns.length > 0) exportToCSV(formatCampaignsForCSV(campaigns), 'campaigns');
            }}
            disabled={!campaigns || campaigns.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
            title={!campaigns || campaigns.length === 0 ? 'No campaigns to export' : 'Download campaigns as CSV'}
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Platforms</option>
          {Object.entries(PLATFORM_INFO).map(([key, info]) => (
            <option key={key} value={key}>{info.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {['draft', 'active', 'paused', 'completed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      ) : !campaigns?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Megaphone size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">No campaigns yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-sm text-blue-600 hover:underline font-medium"
          >
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Campaign</th>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Platform</th>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Budget/day</th>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Leads</th>
                <th scope="col" className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
                <th scope="col" className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/campaigns/${c.id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5"><Badge label={c.platform} /></td>
                  <td className="px-5 py-3.5"><Badge label={c.status} /></td>
                  <td className="px-5 py-3.5 text-gray-600">{c.dailyBudget ? `$${c.dailyBudget}` : '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{(c as any)._count?.leads ?? 0}</td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      {c.status === 'draft' && (
                        <button
                          onClick={() => launchMutation.mutate(c.id)}
                          disabled={launchMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                          title={`Launch on ${PLATFORM_INFO[c.platform]?.name || c.platform}`}
                        >
                          <Rocket size={12} /> Launch
                        </button>
                      )}
                      {c.status === 'active' && (
                        <button
                          onClick={() => pauseMutation.mutate(c.id)}
                          disabled={pauseMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 disabled:opacity-50 transition-colors"
                          title="Pause this campaign"
                        >
                          <Pause size={12} /> {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <button
                          onClick={() => activateMutation.mutate(c.id)}
                          disabled={activateMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors"
                          title="Resume this campaign"
                        >
                          <Play size={12} /> {activateMutation.isPending ? 'Resuming...' : 'Resume'}
                        </button>
                      )}
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
