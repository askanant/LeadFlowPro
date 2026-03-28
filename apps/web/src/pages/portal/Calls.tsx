import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Play, Pause, Volume2, Loader, Download } from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/Badge';
import { exportToCSV, formatCallsForCSV } from '../../utils/csv';

interface CallLog {
  id: string;
  fromNumber: string;
  toNumber: string;
  durationSeconds: number;
  status: 'completed' | 'no-answer' | 'failed' | 'busy';
  startedAt: string;
  recordingUrl?: string;
}

interface CallWithLead extends CallLog {
  leadName?: string;
  agent?: string;
}

function fmt(secs: number) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function InlinePlayer({ url, callId }: { url: string; callId: string }) {
  const [playing, setPlaying] = useState(false);

  if (!url) {
    return <span className="text-xs text-gray-600 italic">Processing...</span>;
  }

  return (
    <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2 py-1 w-fit">
      <button onClick={() => setPlaying((p) => !p)} className="text-blue-600" aria-label={playing ? 'Pause recording' : 'Play recording'}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <Volume2 size={12} className="text-blue-400" />
      <span className="text-xs text-blue-700 font-medium">Play</span>
      <audio src={url} id={`audio-${callId}`} onEnded={() => setPlaying(false)}>
        <track kind="captions" />
      </audio>
    </div>
  );
}

export function PortalCalls() {
  const [agentFilter, setAgentFilter] = useState('All Agents');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: calls = [], isLoading } = useQuery<CallWithLead[]>({
    queryKey: ['calls'],
    queryFn: async () => {
      const res = await api.get('/telephony/calls');
      return res.data.data || [];
    },
    staleTime: 30000,
  });

  const uniqueAgents: string[] = ['All Agents', ...new Set(calls.map((c: CallWithLead) => c.agent || 'Unknown'))];

  const filtered = calls.filter((c: CallWithLead) => {
    if (agentFilter !== 'All Agents' && c.agent !== agentFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const totalDuration = filtered.reduce((sum, c: CallWithLead) => sum + (c.durationSeconds || 0), 0);
  const totalCompleted = filtered.filter((c: CallWithLead) => c.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Call Recordings</h1>
          <p className="text-sm text-gray-500 mt-1">All inbound calls — recorded for quality assurance</p>
        </div>
        <button
          onClick={() => {
            if (filtered.length > 0) exportToCSV(formatCallsForCSV(filtered), 'calls');
          }}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
          title={filtered.length === 0 ? 'No calls to export' : 'Download calls as CSV'}
        >
          <Download size={16} /> Export
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Calls', value: filtered.length },
          { label: 'Completed', value: totalCompleted },
          { label: 'Total Duration', value: fmt(totalDuration) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm px-5 py-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-bold tracking-tight text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          {uniqueAgents.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="">All Statuses</option>
          {['completed', 'no-answer', 'failed', 'busy'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <PhoneCall size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-500">No calls found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-50 bg-gray-50/50">
              <tr>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">From</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">To</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Duration</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Recording</th>
                <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((call: CallWithLead) => (
                <tr key={call.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{call.fromNumber}</td>
                  <td className="px-5 py-4 text-gray-600 font-mono text-xs">{call.toNumber}</td>
                  <td className="px-5 py-4"><Badge label={call.status} /></td>
                  <td className="px-5 py-4 text-gray-600 font-mono text-xs">{fmt(call.durationSeconds)}</td>
                  <td className="px-5 py-4">
                    <InlinePlayer url={call.recordingUrl || ''} callId={call.id} />
                  </td>
                  <td className="px-5 py-4 text-gray-600 text-xs">
                    {new Date(call.startedAt).toLocaleString('en-IN')}
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
