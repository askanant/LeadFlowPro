import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, PhoneCall, ChevronDown, MessageSquare } from "lucide-react";
import { api } from "../../api/client";
import { Badge } from "../../components/Badge";

const STATUSES = ["new", "contacted", "qualified", "disqualified", "converted"];

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PortalLeadDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: calls = [] } = useQuery({
    queryKey: ["lead-calls", id],
    queryFn: async () => {
      const res = await api.get(`/leads/${id}/calls`);
      return res.data.data || [];
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.patch(`/leads/${id}/status`, { status: newStatus });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      setStatusOpen(false);
    },
  });

  const handleStatusChange = (s: string) => {
    statusMutation.mutate(s);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await api.post(`/leads/${id}/notes`, { content: noteText });
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
    } catch (err) {
      console.error("Failed to add note", err);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><p>Loading...</p></div>;
  if (!lead) return <div className="p-8 text-center"><p>Lead not found</p></div>;

  const qualityColorMap: Record<'excellent' | 'good' | 'fair' | 'poor', string> = {
    excellent: "bg-green-100 text-green-800",
    good: "bg-blue-100 text-blue-800",
    fair: "bg-yellow-100 text-yellow-800",
    poor: "bg-red-100 text-red-800",
  };

  const qualityColor = qualityColorMap[lead.quality as keyof typeof qualityColorMap] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/portal/leads" className="text-blue-600 mb-6 inline-block">
        <ArrowLeft size={14} className="inline mr-1" /> Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {lead.firstName} {lead.lastName}
        </h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-600">{lead.email}</span>
          <span className="text-gray-600">{lead.phone}</span>
          {lead.company && <span className="text-gray-600">@ {lead.company}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="w-full flex items-center justify-between p-2 border rounded bg-white hover:bg-gray-50"
            >
              <Badge label={lead.status} />
              <ChevronDown size={16} />
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 capitalize"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <label className="text-sm font-medium text-gray-700 block mb-2">Quality</label>
          <div className={`p-2 rounded text-center font-medium ${qualityColor}`}>
            {lead.quality ? lead.quality.charAt(0).toUpperCase() + lead.quality.slice(1) : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {lead.city && (
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="text-sm font-medium text-gray-700 block mb-2">City</label>
            <p>{lead.city}</p>
          </div>
        )}
        {lead.state && (
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="text-sm font-medium text-gray-700 block mb-2">State</label>
            <p>{lead.state}</p>
          </div>
        )}
        {lead.platform && (
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="text-sm font-medium text-gray-700 block mb-2">Platform</label>
            <p className="capitalize">{lead.platform}</p>
          </div>
        )}
      </div>

      {calls.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <PhoneCall size={18} /> Call History
          </h2>
          <div className="space-y-3">
            {calls.map((call: any) => (
              <div key={call.id} className="border rounded p-3 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span className="text-sm">
                      {new Date(call.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {call.fromNumber} to {call.toNumber} · {fmt(call.durationSeconds)}
                  </div>
                </div>
                <Badge label={call.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <MessageSquare size={18} /> Notes
        </h2>
        <div className="mb-4 flex gap-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 border rounded p-2 text-sm"
            rows={3}
          />
          <button
            onClick={handleAddNote}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 self-end"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
