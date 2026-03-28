import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assignedNumbers: string[];
  leadsThisMonth: number;
  callsThisMonth: number;
}

interface AddAgentForm {
  name: string;
  email: string;
  phone: string;
}

export function PortalAgents() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddAgentForm>({ name: '', email: '', phone: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await api.get('/agents');
      return res.data.data || [];
    },
    staleTime: 30000,
  });

  const activeCount = agents.filter((a: Agent) => a.status === 'active').length;
  const slotsLeft = 5 - activeCount;

  async function handleAdd() {
    if (!form.name || !form.email) return;
    const [firstName, lastName] = form.name.split(' ').length > 1
      ? [form.name.split(' ')[0], form.name.split(' ').slice(1).join(' ')]
      : [form.name, ''];
    try {
      await api.post('/agents', { email: form.email, firstName, lastName });
      setForm({ name: '', email: '', phone: '' });
      setShowAdd(false);
    } catch (err) {
      console.error('Failed to add agent:', err);
    }
  }

  async function handleRemove(id: string) {
    try {
      await api.delete(`/agents/${id}`);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to remove agent:', err);
    }
  }

  if (isLoading) return <div className="p-8"><p>Loading agents...</p></div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Agents</h1>
        {slotsLeft > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus size={18} /> Add Agent
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-gray-100 p-4 rounded mb-6">
          <h2 className="font-bold mb-4">Add New Agent</h2>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border p-2 rounded"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border p-2 rounded"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <Users size={16} />
        <span>
          {activeCount} active · {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
        </span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Leads (Month)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                Calls (Month)
              </th>
              <th scope="col" className="px-6 py-3 text-center text-sm font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {agents.map((agent: Agent) => (
              <tr key={agent.id}>
                <td className="px-6 py-3">{agent.name}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{agent.email}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{agent.phone || '—'}</td>
                <td className="px-6 py-3">{agent.leadsThisMonth}</td>
                <td className="px-6 py-3">{agent.callsThisMonth}</td>
                <td className="px-6 py-3 text-center">
                  {confirmDelete === agent.id ? (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          handleRemove(agent.id);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(agent.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Deactivate agent"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12 text-gray-500">No agents yet</div>
      )}
    </div>
  );
}
