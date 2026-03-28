import { useState } from 'react';
import { Calendar, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Mail } from 'lucide-react';
import {
  useScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  type ScheduledReport,
} from '../api/reports';

const REPORT_TYPES = [
  { value: 'campaign_performance', label: 'Campaign Performance' },
  { value: 'lead_scoring', label: 'Lead Scoring Summary' },
  { value: 'workflow_summary', label: 'Workflow Execution Summary' },
  { value: 'growth_optimization', label: 'Growth Optimization' },
] as const;

const SCHEDULE_PRESETS = [
  { value: '0 9 * * 1', label: 'Weekly (Mon 9 AM)' },
  { value: '0 9 * * 1-5', label: 'Weekdays (9 AM)' },
  { value: '0 9 1 * *', label: 'Monthly (1st, 9 AM)' },
  { value: '0 9 1,15 * *', label: 'Bi-monthly (1st & 15th, 9 AM)' },
];

export function ScheduledReports() {
  const { data: reports, isLoading } = useScheduledReports();
  const createReport = useCreateScheduledReport();
  const updateReport = useUpdateScheduledReport();
  const deleteReport = useDeleteScheduledReport();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    reportType: 'campaign_performance' as string,
    schedule: '0 9 * * 1',
    recipientInput: '',
    recipients: [] as string[],
  });

  const handleAddRecipient = () => {
    const email = form.recipientInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !form.recipients.includes(email)) {
      setForm(f => ({ ...f, recipients: [...f.recipients, email], recipientInput: '' }));
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setForm(f => ({ ...f, recipients: f.recipients.filter(r => r !== email) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.recipients.length === 0) return;
    await createReport.mutateAsync({
      name: form.name,
      reportType: form.reportType as ScheduledReport['reportType'],
      schedule: form.schedule,
      recipients: form.recipients,
      filters: null,
      isActive: true,
    });
    setForm({ name: '', reportType: 'campaign_performance', schedule: '0 9 * * 1', recipientInput: '', recipients: [] });
    setShowForm(false);
  };

  const handleToggle = (report: ScheduledReport) => {
    updateReport.mutate({ id: report.id, isActive: !report.isActive });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this scheduled report?')) {
      deleteReport.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-64" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Scheduled Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Automate report delivery to your inbox</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> New Scheduled Report
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Create Scheduled Report</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Report Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Weekly Campaign Report"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
              <select
                value={form.reportType}
                onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {REPORT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule</label>
              <select
                value={form.schedule}
                onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {SCHEDULE_PRESETS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Add Recipient</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={form.recipientInput}
                  onChange={e => setForm(f => ({ ...f, recipientInput: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <button type="button" onClick={handleAddRecipient} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                  Add
                </button>
              </div>
            </div>
          </div>

          {form.recipients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {form.recipients.map(email => (
                <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                  {email}
                  <button type="button" onClick={() => handleRemoveRecipient(email)} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReport.isPending || !form.name || form.recipients.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {createReport.isPending ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      )}

      {/* Reports List */}
      {(!reports || reports.length === 0) ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Calendar className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-500 text-sm">No scheduled reports yet</p>
          <p className="text-gray-400 text-xs mt-1">Create one to automate report delivery</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 text-sm">{report.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${report.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {report.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {REPORT_TYPES.find(t => t.value === report.reportType)?.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {SCHEDULE_PRESETS.find(s => s.value === report.schedule)?.label ?? report.schedule}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail size={11} />
                    {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                  </span>
                  {report.lastSentAt && (
                    <span className="text-gray-400">Last sent: {new Date(report.lastSentAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleToggle(report)}
                className="text-gray-400 hover:text-indigo-600 transition-colors"
                title={report.isActive ? 'Pause' : 'Activate'}
              >
                {report.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
              </button>
              <button
                onClick={() => handleDelete(report.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
