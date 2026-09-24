import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
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
  return (
    c.is_profane ||
    (c.spam_score != null && c.spam_score >= 0.5) ||
    c.is_repeated_submission ||
    c.is_likely_fake
  );
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
      {complaint.is_likely_fake && (
        <span title={`Fake-complaint score ${Math.round((complaint.fake_score || 0) * 100)}%: ${complaint.fake_signals?.join(', ') || 'n/a'}`}>🎭</span>
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

function OperationsSidebar() {
  const links = [['/admin/dashboard', 'Overview'], ['/admin/hotspots', 'City map'], ['/admin/analytics', 'Analytics'], ['/admin/departments', 'Departments'], ['/admin/officers', 'Officers'], ['/admin/insights', 'Insights'], ['/admin/reports', 'Reports']];
  return <aside className="hidden xl:flex fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-[#263750] bg-[#0b1424] p-6 text-[#a6b6c8]"><Link to="/admin/dashboard" className="text-xl font-bold tracking-tight text-white">CIVIC <span className="text-[#55e0ce]">AI</span></Link><p className="mt-1 text-xs uppercase tracking-[.18em]">City operations</p><nav className="mt-10 space-y-1">{links.map(([to, label]) => <Link key={to} to={to} className={`block rounded-xl px-3 py-2.5 text-sm hover:bg-[#142238] hover:text-white ${to === '/admin/dashboard' ? 'bg-[#142238] text-[#55e0ce]' : ''}`}>{label}</Link>)}</nav><p className="mt-auto text-xs leading-5">Live civic intelligence<br />for better city care.</p></aside>;
}

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

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
    apiClient.get('/departments').then(({ data }) => setAllDepartments(data)).catch(() => {});
  }, []);

  async function handleReassignDepartment(id, departmentId) {
    const previous = complaints;
    const department = allDepartments.find((d) => d.id === Number(departmentId));
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, department_id: department?.id ?? null, department_name: department?.name ?? null } : c))
    );
    try {
      await apiClient.patch(`/complaints/${id}/reassign-department`, { department_id: departmentId });
      toast.success(`Reassigned to ${department?.name}`);
      // The complaint may no longer belong in a department-scoped view.
      loadComplaints();
    } catch (err) {
      setComplaints(previous);
      toast.error(err.response?.data?.error || 'Failed to reassign department');
    }
  }

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
    <div className="min-h-screen bg-[#0b1424] text-[#f7fafc]">
      <OperationsSidebar />
      <Navbar />
      <PageTransition className="max-w-6xl mx-auto px-6 py-8 xl:ml-60 [&_h1]:text-[#f7fafc] [&_h2]:text-[#f7fafc] [&_.bg-white]:bg-[#142238] [&_.text-ink]:text-[#f7fafc] [&_.text-ink-soft]:text-[#a6b6c8] [&_.border-paper-line]:border-[#263750]">
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
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className="border-t border-paper-line dark:border-board-line hover:bg-paper-warm dark:hover:bg-board-line/40 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-ink dark:text-paper">{c.title}</td>
                <td className="px-4 py-3 text-ink-soft">{c.citizen_name}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={c.department_id || ''}
                    onChange={(e) => handleReassignDepartment(c.id, e.target.value)}
                    className={SELECT_CLASS}
                    title={c.ai_confidence != null ? `AI-routed at ${Math.round(c.ai_confidence * 100)}% confidence` : undefined}
                  >
                    <option value="" disabled>Unassigned</option>
                    {allDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {c.ai_confidence != null && (
                    <span className="ml-1 text-xs text-ink-soft font-mono">{Math.round(c.ai_confidence * 100)}%</span>
                  )}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={c.ai_priority} /></td>
                <td className="px-4 py-3"><SentimentBadge sentiment={c.sentiment} /></td>
                <td className="px-4 py-3 text-ink-soft font-mono">{c.estimated_resolution_label || '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
      {selected && <div className="fixed inset-0 z-60 flex justify-end bg-black/50" onClick={() => setSelected(null)}><motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-lg overflow-y-auto border-l border-[#263750] bg-[#142238] p-6 text-[#f7fafc] shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold tracking-[.18em] text-[#55e0ce]">COMPLAINT #{selected.id}</p><h2 className="mt-2 text-2xl font-bold">{selected.title}</h2><p className="mt-2 text-sm text-[#a6b6c8]">{selected.location_text || 'Location not provided'} · {new Date(selected.created_at).toLocaleDateString()}</p></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-[#a6b6c8] hover:bg-white/10">✕</button></div><div className="mt-7 space-y-5"><section className="rounded-xl bg-[#0b1424] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#a6b6c8]">Description</p><p className="mt-2 text-sm leading-6">{selected.description}</p></section><div className="grid grid-cols-2 gap-3"><section className="rounded-xl border border-[#263750] p-4"><p className="text-xs text-[#a6b6c8]">Priority</p><div className="mt-2"><PriorityBadge priority={selected.ai_priority} /></div></section><section className="rounded-xl border border-[#263750] p-4"><p className="text-xs text-[#a6b6c8]">Status</p><div className="mt-2"><StatusBadge status={selected.status} /></div></section></div><section><label className="text-sm font-medium">Update status</label><select value={selected.status} onChange={(e) => { handleStatusChange(selected.id, e.target.value); setSelected({ ...selected, status: e.target.value }); }} className="mt-2 w-full rounded-lg border border-[#263750] bg-[#0b1424] p-3 text-sm">{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></section><section><label className="text-sm font-medium">Assign officer</label><select value={selected.assigned_officer_id || ''} onChange={(e) => { handleAssign(selected.id, e.target.value); const officer = officers.find((o) => o.id === Number(e.target.value)); setSelected({ ...selected, assigned_officer_id: officer?.id, assigned_officer_name: officer?.name }); }} className="mt-2 w-full rounded-lg border border-[#263750] bg-[#0b1424] p-3 text-sm"><option value="">Unassigned</option>{officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></section><section className="rounded-xl border border-[#263750] p-4"><p className="text-xs text-[#a6b6c8]">AI insights</p><p className="mt-2 text-sm">Category: {selected.ai_category || 'Unclassified'} · Sentiment: {selected.sentiment || 'Unavailable'}</p><p className="mt-1 text-xs text-[#a6b6c8]">AI suggestions support staff review and are not verified facts.</p></section></div></motion.aside></div>}
    </div>
  );
}
