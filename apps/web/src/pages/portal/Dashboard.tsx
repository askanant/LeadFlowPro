import { Inbox, PhoneCall, Users, Hash, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/Badge';

const STATS = [
  { label: "Today's Leads", value: '23', sub: '+8 from yesterday', icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'This Week', value: '156', sub: '↑ 12% vs last week', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Active Agents', value: '4 / 5', sub: '1 slot remaining', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Numbers Active', value: '3', sub: '2 with agents', icon: Hash, color: 'text-orange-600', bg: 'bg-orange-50' },
];

const RECENT_LEADS = [
  { id: 'l1', name: 'Vikash Gupta', phone: '+919123456781', city: 'Mumbai', status: 'new', score: 85, time: '10 min ago' },
  { id: 'l2', name: 'Sunita Yadav', phone: '+919234567891', city: 'Delhi', status: 'contacted', score: 72, time: '32 min ago' },
  { id: 'l3', name: 'Rajesh Verma', phone: '+919345678901', city: 'Pune', status: 'qualified', score: 91, time: '1 hr ago' },
  { id: 'l4', name: 'Meena Joshi', phone: '+919456789012', city: 'Bangalore', status: 'new', score: 68, time: '2 hr ago' },
  { id: 'l5', name: 'Arjun Nair', phone: '+919567890123', city: 'Chennai', status: 'contacted', score: 79, time: '3 hr ago' },
];

const RECENT_CALLS = [
  { id: 'c1', from: '+919123456781', agent: 'Rahul Sharma', duration: '4:05', status: 'completed', time: '15 min ago', hasRecording: true },
  { id: 'c2', from: '+919234567891', agent: 'Priya Singh', duration: '1:42', status: 'completed', time: '45 min ago', hasRecording: true },
  { id: 'c3', from: '+919345678901', agent: 'Amit Kumar', duration: '—', status: 'no-answer', time: '1 hr ago', hasRecording: false },
  { id: 'c4', from: '+919456789012', agent: 'Rahul Sharma', duration: '7:18', status: 'completed', time: '2 hr ago', hasRecording: true },
  { id: 'c5', from: '+919567890123', agent: 'Priya Singh', duration: '2:33', status: 'completed', time: '4 hr ago', hasRecording: true },
];

export function PortalDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-600 mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Recent Leads */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Inbox size={15} className="text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-900">Recent Leads</h2>
            </div>
            <Link to="/portal/leads" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_LEADS.map((lead) => (
              <Link
                key={lead.id}
                to={`/portal/leads/${lead.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                    <Badge label={lead.status} />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{lead.phone} · {lead.city}</p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${lead.score}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{lead.score}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-0.5">
                      <Clock size={9} /> {lead.time}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <PhoneCall size={15} className="text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-900">Recent Calls</h2>
            </div>
            <Link to="/portal/calls" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_CALLS.map((call) => (
              <div key={call.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{call.from}</p>
                    <Badge label={call.status} />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{call.agent} · {call.duration}</p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  {call.hasRecording && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
                      <PhoneCall size={9} /> Recorded
                    </span>
                  )}
                  <p className="text-[10px] text-gray-600 mt-1">{call.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
