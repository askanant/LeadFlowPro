import { useState } from 'react';
import { Hash, Phone, Users } from 'lucide-react';

const MOCK_AGENTS = [
  { id: 'a1', name: 'Rahul Sharma' },
  { id: 'a2', name: 'Priya Singh' },
  { id: 'a3', name: 'Amit Kumar' },
];

type RoutingType = 'specific' | 'round_robin' | 'all';

interface NumberRecord {
  id: string;
  number: string;
  friendlyName: string;
  provider: string;
  routingType: RoutingType;
  assignedAgentIds: string[];
  callsThisMonth: number;
  status: 'active' | 'inactive';
}

const MOCK_NUMBERS: NumberRecord[] = [
  {
    id: 'n1',
    number: '+918888100001',
    friendlyName: 'Sales Line 1',
    provider: 'Exotel',
    routingType: 'specific',
    assignedAgentIds: ['a1'],
    callsThisMonth: 127,
    status: 'active',
  },
  {
    id: 'n2',
    number: '+918888100002',
    friendlyName: 'Sales Line 2',
    provider: 'Exotel',
    routingType: 'round_robin',
    assignedAgentIds: ['a2', 'a3'],
    callsThisMonth: 98,
    status: 'active',
  },
  {
    id: 'n3',
    number: '+918888100003',
    friendlyName: 'Support Line',
    provider: 'Exotel',
    routingType: 'all',
    assignedAgentIds: ['a1', 'a2', 'a3'],
    callsThisMonth: 44,
    status: 'active',
  },
];

const ROUTING_LABELS: Record<RoutingType, string> = {
  specific: 'Specific Agent',
  round_robin: 'Round Robin',
  all: 'Ring All',
};

const ROUTING_DESCRIPTIONS: Record<RoutingType, string> = {
  specific: 'Always routes to one assigned agent',
  round_robin: 'Rotates calls among assigned agents evenly',
  all: 'Rings all assigned agents simultaneously',
};

function AgentTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
      <Users size={10} />
      {name}
    </span>
  );
}

function RoutingBadge({ type }: { type: RoutingType }) {
  const colors: Record<RoutingType, string> = {
    specific: 'bg-blue-50 text-blue-700',
    round_robin: 'bg-purple-50 text-purple-700',
    all: 'bg-green-100/80 text-green-700',
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${colors[type]}`}>
      {ROUTING_LABELS[type]}
    </span>
  );
}

function AssignModal({
  record,
  onClose,
  onSave,
}: {
  record: NumberRecord;
  onClose: () => void;
  onSave: (updated: Pick<NumberRecord, 'routingType' | 'assignedAgentIds'>) => void;
}) {
  const [routingType, setRoutingType] = useState<RoutingType>(record.routingType);
  const [selected, setSelected] = useState<Set<string>>(new Set(record.assignedAgentIds));

  function toggleAgent(id: string) {
    if (routingType === 'specific') {
      setSelected(new Set([id]));
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  }

  function handleRoutingChange(type: RoutingType) {
    setRoutingType(type);
    if (type === 'specific' && selected.size > 1) {
      setSelected(new Set([...selected][0] ? new Set([[...selected][0]]) : new Set()));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Assign Number">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Assign Number</h2>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{record.number}</p>
        </div>

        {/* Routing type */}
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Routing Mode</p>
          <div className="space-y-2">
            {(Object.keys(ROUTING_LABELS) as RoutingType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleRoutingChange(type)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  routingType === type
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`text-sm font-medium ${routingType === type ? 'text-blue-700' : 'text-gray-800'}`}>
                  {ROUTING_LABELS[type]}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{ROUTING_DESCRIPTIONS[type]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Agent selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {routingType === 'specific' ? 'Select Agent' : 'Select Agents'}
          </p>
          <div className="space-y-2">
            {MOCK_AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                  selected.has(agent.id)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-4 h-4 rounded ${routingType === 'specific' ? 'rounded-full' : ''} border-2 flex items-center justify-center flex-shrink-0 ${
                  selected.has(agent.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {selected.has(agent.id) && (
                    <div className={`bg-white ${routingType === 'specific' ? 'w-1.5 h-1.5 rounded-full' : 'w-2 h-1.5 border-l border-b border-white transform -rotate-45 mt-0.5'}`} />
                  )}
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase">
                  {agent.name[0]}
                </div>
                <span className="text-sm text-gray-800 font-medium">{agent.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ routingType, assignedAgentIds: [...selected] })}
            disabled={selected.size === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Save Assignment
          </button>
        </div>
      </div>
    </div>
  );
}

export function PortalNumbers() {
  const [numbers, setNumbers] = useState<NumberRecord[]>(MOCK_NUMBERS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingRecord = numbers.find((n) => n.id === editingId);

  function handleSave(id: string, updates: Pick<NumberRecord, 'routingType' | 'assignedAgentIds'>) {
    setNumbers((prev) => prev.map((n) => n.id === id ? { ...n, ...updates } : n));
    setEditingId(null);
  }

  function getAgentNames(ids: string[]) {
    return ids.map((id) => MOCK_AGENTS.find((a) => a.id === id)?.name ?? id);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Phone Numbers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign numbers to agents and configure routing — {numbers.filter(n => n.status === 'active').length} active numbers
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-50 bg-gray-50/50">
            <tr>
              <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Number</th>
              <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Provider</th>
              <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Routing</th>
              <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Assigned Agents</th>
              <th scope="col" className="text-left px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Calls (Month)</th>
              <th scope="col" className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {numbers.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center">
                      <Phone size={13} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-mono text-gray-900 text-xs font-medium">{rec.number}</p>
                      <p className="text-xs text-gray-600">{rec.friendlyName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{rec.provider}</span>
                </td>
                <td className="px-5 py-4">
                  <RoutingBadge type={rec.routingType} />
                </td>
                <td className="px-5 py-4">
                  {rec.assignedAgentIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getAgentNames(rec.assignedAgentIds).map((name) => (
                        <AgentTag key={name} name={name} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-600 font-medium">{rec.callsThisMonth}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => setEditingId(rec.id)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {numbers.length === 0 && (
          <div className="p-12 text-center">
            <Hash size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-500">No numbers assigned to your account yet</p>
            <p className="text-xs text-gray-600 mt-1">Contact your admin to assign numbers</p>
          </div>
        )}
      </div>

      {editingRecord && (
        <AssignModal
          record={editingRecord}
          onClose={() => setEditingId(null)}
          onSave={(updates) => handleSave(editingRecord.id, updates)}
        />
      )}
    </div>
  );
}
