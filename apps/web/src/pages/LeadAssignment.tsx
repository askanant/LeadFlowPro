import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { Users, BarChart3, Zap } from 'lucide-react';

function useAssignmentData() {
  return useQuery({
    queryKey: ['lead-assignments'],
    queryFn: async () => {
      const [statsRes, leadsRes] = await Promise.all([
        api.get('/assignments/stats'),
        api.get('/leads?limit=100'),
      ]);
      return { stats: statsRes.data.data, leads: leadsRes.data.data };
    },
  });
}

export function LeadAssignment() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAssignmentData();
  const [selectedAgent, setSelectedAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState('unassigned');

  const assignMutation = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      return api.post(`/assignments/${leadId}/assign`, { agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignments'] });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return api.post(`/assignments/${leadId}/auto-assign`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignments'] });
    },
  });

  if (isLoading) {
    return <div className="p-8 animate-pulse">Loading...</div>;
  }

  const stats: any = data?.stats;
  const allLeads: any[] = data?.leads ?? [];
  const unassignedLeads = allLeads.filter((l: any) => !l.assignedAgentId);
  const agents: any[] = stats?.agents ?? [];

  const displayLeads = filterStatus === 'unassigned' ? unassignedLeads : allLeads;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Lead Assignment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Active Agents" value={stats?.totalAgents || 0} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Unassigned Leads" value={unassignedLeads.length} icon={Zap} color="text-orange-600" bg="bg-orange-50" />
        <StatCard title="Avg Leads/Agent" value={stats?.averageLeadsPerAgent.toFixed(1) || '0'} icon={BarChart3} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold mb-4">Agents</h2>
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedAgent === agent.id
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-gray-500">{agent.assignedLeads} leads</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Leads</h2>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="unassigned">Unassigned Only</option>
                <option value="all">All Leads</option>
              </select>
            </div>

            {displayLeads.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No leads to display</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {displayLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                    {selectedAgent ? (
                      <button
                        onClick={() => assignMutation.mutate({ leadId: lead.id, agentId: selectedAgent })}
                        disabled={assignMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                      >
                        Assign
                      </button>
                    ) : (
                      <button
                        onClick={() => autoAssignMutation.mutate(lead.id)}
                        disabled={autoAssignMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
