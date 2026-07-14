import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { PriorityBadge, StatusBadge, SentimentBadge } from '../components/Badges';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import { SkeletonRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const STATUS_OPTIONS = ['submitted', 'in_progress', 'resolved', 'rejected'];

const SELECT_CLASS =
  'border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper px-2 py-1 text-xs';

function isFlagged(c) {
  return c.is_profane || (c.spam_score != null && c.spam_score >= 0.5) || c.is_repeated_submission;
}

function FlagBadges({ complaint }) {
  if (!isFlagged(complaint)) return <span className="text-paper-line dark:text-board-line">—</span>;
  return (
    <div className="flex gap-1">
      {complaint.is_profane && <span title="Profanity detected">🤬</span>}
      {complaint.spam_score != null && complaint.spam_score >= 0.5 && (
        <span title={`Spam signals: ${complaint.spam_signals?.join(', ') || 'n/a'}`}>🚨</span>
      )}
      {complaint.is_repeated_submission && (
        <span title={`Similar to complaint #${complaint.repeated_of_complaint_id}`}>🔁</span>
      )}
    </div>
  );
}

const COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'citizen', label: 'Citizen' },
  { key: 'department', label: 'Department' },
  { key: 'priority', label: 'Priority' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'resolution', label: 'Est. Resolution' },
  { key: 'officer', label: 'Officer' },
  { key: 'flags', label: 'Flags' },
  { key: 'status', label: 'Status' },
  { key: 'submitted', label: 'Submitted' },
];

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const toast = useToast();

  function loadComplaints() {
    setLoading(true);
    apiClient
      .get('/complaints')
      .then(({ data }) => setComplaints(data))
      .catch(() => setError('Failed to load complaints'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadComplaints();
    apiClient.get('/officers').then(({ data }) => setOfficers(data)).catch(() => {});
  }, []);

  async function handleStatusChange(id, status) {
    const previous = complaints;
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      await apiClient.patch(`/complaints/${id}/status`, { status });
      toast.success('Status updated');
    } catch {
      setComplaints(previous);
      toast.error('Failed to update status');
    }
  }

  async function handleAssign(id, officerId) {
    const previous = complaints;
    const officer = officers.find((o) => o.id === Number(officerId));
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, assigned_officer_id: officer?.id ?? null, assigned_officer_name: officer?.name ?? null } : c))
    );
    try {
      await apiClient.patch(`/complaints/${id}/assign`, { officer_id: officerId || null });
      toast.success(officer ? `Assigned to ${officer.name}` : 'Unassigned');
    } catch {
      setComplaints(previous);
      toast.error('Failed to assign officer');
    }
  }

  const departments = [...new Set(complaints.map((c) => c.department_name).filter(Boolean))];

  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && c.department_name !== departmentFilter) return false;
    if (flaggedOnly && !isFlagged(c)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />
      <PageTransition className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Ledger</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">All Complaints</h1>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${SELECT_CLASS} py-2`}
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`${SELECT_CLASS} py-2`}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-ink-soft">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
            Flagged only
          </label>
        </div>

        {loading && <SkeletonRows rows={5} />}
        {error && <p className="text-stamp-red mb-4">{error}</p>}

        {!loading && (
          <DataTable
            columns={COLUMNS}
            data={filtered}
            searchPredicate={(c, q) => c.title.toLowerCase().includes(q) || c.citizen_name.toLowerCase().includes(q)}
            searchPlaceholder="Search by title or citizen..."
            emptyState={<EmptyState icon="🔍" title="No complaints match these filters" />}
            renderRow={(c) => (
              <tr key={c.id} className="border-t border-paper-line dark:border-board-line hover:bg-paper-warm dark:hover:bg-board-line/40 transition-colors">
                <td className="px-4 py-3 font-medium text-ink dark:text-paper">{c.title}</td>
                <td className="px-4 py-3 text-ink-soft">{c.citizen_name}</td>
                <td className="px-4 py-3 text-ink-soft">{c.department_name || 'Unassigned'}</td>
                <td className="px-4 py-3"><PriorityBadge priority={c.ai_priority} /></td>
                <td className="px-4 py-3"><SentimentBadge sentiment={c.sentiment} /></td>
                <td className="px-4 py-3 text-ink-soft font-mono">{c.estimated_resolution_label || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.assigned_officer_id || ''}
                    onChange={(e) => handleAssign(c.id, e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Unassigned</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3"><FlagBadges complaint={c} /></td>
                <td className="px-4 py-3">
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <span className="ml-2"><StatusBadge status={c.status} /></span>
                </td>
                <td className="px-4 py-3 text-ink-soft font-mono">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            )}
          />
        )}
      </PageTransition>
    </div>
  );
}
