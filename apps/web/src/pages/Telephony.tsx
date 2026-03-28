import { useState, useEffect } from 'react';
import { Phone, Plus, PlayCircle, RefreshCw, Building2, X } from 'lucide-react';
import {
  usePhoneNumbers,
  useCallLogs,
  useProvisionNumber,
  useTelephonyProvider,
  useAvailableNumbers,
  type AvailableNumber,
} from '../api/telephony';
import { Badge } from '../components/Badge';
import { useQueryClient } from '@tanstack/react-query';

const MOCK_COMPANIES = [
  { id: 'co1', name: 'Acme Corp' },
  { id: 'co2', name: 'Sunrise Realty' },
  { id: 'co3', name: 'TechVenture India' },
];

interface AssignCompanyState {
  numberId: string;
  number: string;
  currentCompanyId: string | null;
}

function AssignCompanyModal({ state, onClose, onSave }: {
  state: AssignCompanyState;
  onClose: () => void;
  onSave: (numberId: string, companyId: string | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(state.currentCompanyId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Assign to Company">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assign to Company</h2>
            <p className="text-xs font-mono text-gray-600 mt-0.5">{state.number}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-600" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="space-y-2 mb-5">
          <button
            onClick={() => setSelected(null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors text-sm ${
              !selected ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Unassigned
          </button>
          {MOCK_COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 rounded-xl border transition-colors text-sm ${
                selected === c.id ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold uppercase">
                {c.name[0]}
              </div>
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(state.numberId, selected); onClose(); }}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function Telephony() {
  const [tab, setTab] = useState<'numbers' | 'calls'>('numbers');
  const [showProvision, setShowProvision] = useState(false);
  const [assignCompany, setAssignCompany] = useState<AssignCompanyState | null>(null);
  const [numberCompanyMap, setNumberCompanyMap] = useState<Record<string, string | null>>({});

  const [twilioForm, setTwilioForm] = useState({ forwardTo: '', areaCode: '' });
  const [exotelForm, setExotelForm] = useState({ forwardTo: '', selected: null as AvailableNumber | null });

  const { data: providerInfo } = useTelephonyProvider();
  const provider = providerInfo?.name ?? 'exotel';

  const { data: numbers, isLoading: numLoading } = usePhoneNumbers();
  const { data: callsData, isLoading: callsLoading } = useCallLogs();
  const provisionMutation = useProvisionNumber();
  const qc = useQueryClient();

  const [fetchAvailable, setFetchAvailable] = useState(false);
  const { data: available, isFetching: availableFetching } = useAvailableNumbers({
    areaCode: provider === 'twilio' ? twilioForm.areaCode : undefined,
    enabled: fetchAvailable,
  });

  const calls = callsData?.data ?? [];
  const callsMeta = callsData?.meta;

  const openProvision = () => {
    setShowProvision(true);
    if (provider === 'exotel') setFetchAvailable(true);
  };

  const closeProvision = () => {
    setShowProvision(false);
    setFetchAvailable(false);
    setTwilioForm({ forwardTo: '', areaCode: '' });
    setExotelForm({ forwardTo: '', selected: null });
  };

  const handleTwilioSearch = () => {
    qc.removeQueries({ queryKey: ['telephony', 'available'] });
    setFetchAvailable(true);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();

    if (provider === 'exotel') {
      if (!exotelForm.selected) return;
      await provisionMutation.mutateAsync({
        number: exotelForm.selected.number,
        providerSid: exotelForm.selected.providerSid,
        forwardTo: exotelForm.forwardTo,
      });
    } else {
      const first = available?.[0];
      if (!first) return;
      await provisionMutation.mutateAsync({
        number: first.number,
        providerSid: first.providerSid,
        forwardTo: twilioForm.forwardTo,
      });
    }

    closeProvision();
  };

  function handleCompanyAssign(numberId: string, companyId: string | null) {
    setNumberCompanyMap((prev) => ({ ...prev, [numberId]: companyId }));
  }

  const formatDuration = (secs: number | null) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Telephony</h1>
          <p className="text-sm text-gray-500 mt-1">
            Phone numbers and call logs
            {providerInfo && (
              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-mono capitalize">
                via {provider}
              </span>
            )}
          </p>
        </div>
        {tab === 'numbers' && (
          <button
            onClick={openProvision}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Provision Number
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100/80 p-1 rounded-xl w-fit">
        {(['numbers', 'calls'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Provision modal */}
      {showProvision && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Provision Phone Number" onKeyDown={(e) => { if (e.key === 'Escape') setShowProvision(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Provision Phone Number</h2>
            <p className="text-sm text-gray-500 mb-4">
              {provider === 'exotel'
                ? 'Assign an Exotel number from your account'
                : 'Purchase a US local number via Twilio'}
            </p>

            {provisionMutation.isError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {(provisionMutation.error as any)?.response?.data?.message ?? 'Failed to provision number'}
              </div>
            )}

            <form onSubmit={handleProvision} className="space-y-4">

              {/* ── Exotel: pick from pre-purchased numbers ── */}
              {provider === 'exotel' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Select Number *</label>
                    <button
                      type="button"
                      onClick={() => {
                        qc.removeQueries({ queryKey: ['telephony', 'available'] });
                        setFetchAvailable(true);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <RefreshCw size={12} className={availableFetching ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                  {availableFetching ? (
                    <div className="animate-pulse h-10 bg-gray-100 rounded-xl" />
                  ) : !available?.length ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                      No unassigned numbers found. Purchase numbers from the{' '}
                      <span className="font-medium">Exotel dashboard</span> first, then refresh.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-44 overflow-y-auto">
                      {available.map((n) => (
                        <button
                          key={n.providerSid}
                          type="button"
                          onClick={() => setExotelForm((f) => ({ ...f, selected: n }))}
                          className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                            exotelForm.selected?.providerSid === n.providerSid
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="font-mono">{n.number}</span>
                          {n.friendlyName && n.friendlyName !== n.number && (
                            <span className="ml-2 text-gray-600 text-xs">{n.friendlyName}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Twilio: search by area code ── */}
              {provider === 'twilio' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Code (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={twilioForm.areaCode}
                      onChange={(e) => setTwilioForm({ ...twilioForm, areaCode: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="415"
                      maxLength={3}
                    />
                    <button
                      type="button"
                      onClick={handleTwilioSearch}
                      disabled={availableFetching}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                    >
                      {availableFetching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {available && available.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Will provision:{' '}
                      <span className="font-mono text-gray-700">{available[0]?.number}</span>
                    </p>
                  )}
                  {available && available.length === 0 && (
                    <p className="mt-2 text-xs text-red-600">No numbers found for that area code.</p>
                  )}
                </div>
              )}

              {/* Forward to — shared */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forward calls to *
                </label>
                <input
                  required
                  value={provider === 'exotel' ? exotelForm.forwardTo : twilioForm.forwardTo}
                  onChange={(e) =>
                    provider === 'exotel'
                      ? setExotelForm({ ...exotelForm, forwardTo: e.target.value })
                      : setTwilioForm({ ...twilioForm, forwardTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={provider === 'exotel' ? '+919876543210' : '+15551234567'}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeProvision}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    provisionMutation.isPending ||
                    (provider === 'exotel' && !exotelForm.selected) ||
                    (provider === 'twilio' && !available?.length)
                  }
                  className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {provisionMutation.isPending ? 'Provisioning...' : 'Provision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phone Numbers tab */}
      {tab === 'numbers' && (
        numLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-2xl" />)}
          </div>
        ) : !numbers?.length ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Phone size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-500">No phone numbers yet</p>
            <button
              onClick={openProvision}
              className="mt-3 text-sm text-blue-600 hover:underline font-medium"
            >
              Provision your first number
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-50 bg-gray-50/50">
                <tr>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Phone Number</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Provider</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Provider SID</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Forwards To</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Assigned Company</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Total Calls</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th scope="col" className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {numbers.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900">{n.number}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-mono capitalize">
                        {n.provider ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 font-mono text-xs">{n.providerSid ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-600">{n.forwardTo ?? '—'}</td>
                    <td className="px-5 py-4">
                      {(() => {
                        const cid = numberCompanyMap[n.id] ?? null;
                        const co = MOCK_COMPANIES.find((c) => c.id === cid);
                        return co ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            <Building2 size={11} />
                            {co.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 italic">Unassigned</span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{n._count?.callLogs ?? 0}</td>
                    <td className="px-5 py-4"><Badge label={n.isActive ? 'active' : 'inactive'} /></td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setAssignCompany({ numberId: n.id, number: n.number, currentCompanyId: numberCompanyMap[n.id] ?? null })}
                        className="text-xs font-semibold text-gray-600 hover:text-blue-700 bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Calls tab */}
      {tab === 'calls' && (
        callsLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-2xl" />)}
          </div>
        ) : !calls.length ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Phone size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-500">No calls recorded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-50 bg-gray-50/50">
                <tr>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">From</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">To Number</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Direction</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Duration</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Lead</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Recording</th>
                  <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900">{call.fromNumber ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500">{call.phoneNumber?.number ?? call.toNumber ?? '—'}</td>
                    <td className="px-5 py-4"><Badge label={call.direction} /></td>
                    <td className="px-5 py-4"><Badge label={call.status} /></td>
                    <td className="px-5 py-4 text-gray-600">{formatDuration(call.durationSeconds)}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {call.lead
                        ? [call.lead.firstName, call.lead.lastName].filter(Boolean).join(' ') || call.lead.phone
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {call.recordingUrl ? (
                        <a
                          href={call.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <PlayCircle size={14} /> Play
                        </a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">
                      {call.startedAt ? new Date(call.startedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {callsMeta && (
              <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-600">
                Showing {calls.length} of {callsMeta.total} calls
              </div>
            )}
          </div>
        )
      )}

      {assignCompany && (
        <AssignCompanyModal
          state={assignCompany}
          onClose={() => setAssignCompany(null)}
          onSave={handleCompanyAssign}
        />
      )}
    </div>
  );
}
