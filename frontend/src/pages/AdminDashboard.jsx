
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import AdminShell from '../components/AdminShell';
import { PriorityBadge, StatusBadge, SentimentBadge } from '../components/Badges';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import { SkeletonRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useLanguage } from '../context/LanguageContext';

const STATUS_OPTIONS = ['submitted', 'in_progress', 'resolved', 'rejected'];

const SELECT_CLASS =
  'min-w-28 rounded-md border border-paper-line bg-white px-2.5 py-2 text-xs text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board dark:text-paper';

function isFlagged(c) {
  return (
    c.is_profane ||
    (c.spam_score != null && c.spam_score >= 0.5) ||
    c.is_repeated_submission ||
    c.is_likely_fake ||
    c.fake_score == null
  );
}

function FlagBadges({ complaint, t }) {
  const hasRiskScore = complaint.fake_score != null && Number.isFinite(Number(complaint.fake_score));
  const riskPercent = hasRiskScore ? Math.round(Number(complaint.fake_score) * 100) : null;
  const analysisSource = complaint.source_language === 'hi'
    ? complaint.ai_translation_used
      ? t('Risk checks used an English translation of this Hindi complaint; review the original text.')
      : t('Hindi text checks were unavailable. Review this complaint manually.')
    : t('Heuristic risk score, not a probability that the complaint is false.');
  return (
    <div className="flex gap-1">
      <span
        title={`${analysisSource} ${complaint.fake_signals?.join(', ') || ''}`}
        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
          hasRiskScore && riskPercent >= 50
            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
            : 'bg-paper-warm text-ink-soft dark:bg-board-line dark:text-paper'
        }`}
      >
        {hasRiskScore ? `${t('Risk')} ${riskPercent}%` : t('Not assessed')}
      </span>
      {complaint.is_profane && <span title="Profanity detected">🤬</span>}

      {complaint.spam_score != null && complaint.spam_score >= 0.5 && (
        <span
          title={`Spam signals: ${
            complaint.spam_signals?.join(', ') || 'n/a'
          }`}
        >
          🚨
        </span>
      )}

      {complaint.is_repeated_submission && (
        <span
          title={`Similar to complaint #${complaint.repeated_of_complaint_id}`}
        >
          🔁
        </span>
      )}

      {complaint.is_likely_fake && (
        <span
          title={`${analysisSource} ${complaint.fake_signals?.join(', ') || 'n/a'}`}
        >
          🎭
        </span>
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
  { key: 'flags', label: 'Risk & flags' },
  { key: 'status', label: 'Status' },
  { key: 'submitted', label: 'Submitted' },
];

function OperationsSidebar() {
  const links = [
    ['/admin/dashboard', 'Overview'],
    ['/admin/hotspots', 'City map'],
    ['/admin/analytics', 'Analytics'],
    ['/admin/departments', 'Departments'],
    ['/admin/officers', 'Officers'],
    ['/admin/insights', 'Insights'],
    ['/admin/reports', 'Reports'],
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#263750] bg-[#0b1424] p-6 text-[#a6b6c8] xl:flex">
      <Link
        to="/admin/dashboard"
        className="text-xl font-bold tracking-tight text-white"
      >
        CIVIC <span className="text-[#55e0ce]">AI</span>
      </Link>

      <p className="mt-1 text-xs uppercase tracking-[.18em]">
        City operations
      </p>

      <nav className="mt-10 space-y-1">
        {links.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className={`block rounded-xl px-3 py-2.5 text-sm hover:bg-[#142238] hover:text-white ${
              to === '/admin/dashboard'
                ? 'bg-[#142238] text-[#55e0ce]'
                : ''
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <p className="mt-auto text-xs leading-5">
        Live civic intelligence
        <br />
        for better city care.
      </p>
    </aside>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

    apiClient
      .get('/officers')
      .then(({ data }) => setOfficers(data))
      .catch(() => {});

    apiClient
      .get('/departments')
      .then(({ data }) => setAllDepartments(data))
      .catch(() => {});
  }, []);

  async function handleReassignDepartment(id, departmentId) {
    const previous = complaints;
    const department = allDepartments.find(
      (d) => d.id === Number(departmentId)
    );

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              department_id: department?.id ?? null,
              department_name: department?.name ?? null,
              assignment_source: 'staff',
              image_assignment_review_required: false,
            }
          : c
      )
    );

    try {
      await apiClient.patch(`/complaints/${id}/reassign-department`, {
        department_id: departmentId,
      });

      toast.success(`Reassigned to ${department?.name}`);
      loadComplaints();
    } catch (err) {
      setComplaints(previous);
      toast.error(
        err.response?.data?.error || 'Failed to reassign department'
      );
    }
  }

  async function handleStatusChange(id, status) {
    const previous = complaints;

    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );

    try {
      await apiClient.patch(`/complaints/${id}/status`, { status });
      toast.success('Status updated');
    } catch (err) {
      setComplaints(previous);
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  }

  async function handleAssign(id, officerId) {
    const officer = officers.find((o) => o.id === Number(officerId) && o.status === 'active');
    try {
      const { data } = await apiClient.patch(`/complaints/${id}/assign`, {
        officer_id: officerId || null,
      });
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
      setSelected((prev) => prev?.id === id ? { ...prev, ...data } : prev);
      toast.success(officer ? `Assigned to ${officer.name}` : 'Unassigned');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign officer');
    }
  }

  async function handleConfirmImageAssignment(id) {
    try {
      const { data } = await apiClient.patch(`/complaints/${id}/confirm-image-assignment`);
      setComplaints((prev) => prev.map((item) => item.id === id ? { ...item, ...data } : item));
      setSelected((prev) => prev?.id === id ? { ...prev, ...data } : prev);
      toast.success('Photo reviewed. You can now assign an officer or progress the complaint.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm the image-based assignment');
    }
  }

  const departments = allDepartments.map((d) => d.name);

  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    if (
      departmentFilter !== 'all' &&
      c.department_name !== departmentFilter
    ) {
      return false;
    }

    if (flaggedOnly && !isFlagged(c)) return false;

    return true;
  });

  const submittedCount = complaints.filter(
    (c) => c.status === 'submitted'
  ).length;

  const inProgressCount = complaints.filter(
    (c) => c.status === 'in_progress'
  ).length;

  const resolvedCount = complaints.filter(
    (c) => c.status === 'resolved'
  ).length;

  const criticalCount = complaints.filter(
    (c) => c.ai_priority === 'Critical'
  ).length;

  const flaggedCount = complaints.filter(isFlagged).length;

  const metrics = [
    {
      label: 'Total',
      value: complaints.length,
      tone: 'text-ink dark:text-paper',
    },
    {
      label: 'Submitted',
      value: submittedCount,
      tone: 'text-brass',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      tone: 'text-flap-amber',
    },
    {
      label: 'Critical',
      value: criticalCount,
      tone: 'text-stamp-red',
    },
    {
      label: 'Flagged',
      value: flaggedCount,
      tone: 'text-ai',
    },
    {
      label: 'Resolved',
      value: resolvedCount,
      tone: 'text-civic dark:text-seal-green',
    },
  ];

  return (
    <AdminShell
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search grievances or citizens..."
    >
      <PageTransition className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">
              {t('Operations')}
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-paper sm:text-3xl">
              {t('Ticket Queue')}
            </h1>

            <p className="mt-2 text-sm text-ink-soft">
              Managing {complaints.length} citizen grievance
              {complaints.length === 1 ? '' : 's'} across{' '}
              {departments.length || 0} department
              {departments.length === 1 ? '' : 's'}.
            </p>
          </div>

          <button
            onClick={loadComplaints}
            className="inline-flex items-center justify-center rounded-md border border-paper-line bg-white px-4 py-2.5 text-sm font-semibold text-civic hover:bg-civic-soft dark:border-board-line dark:bg-board dark:text-seal-green dark:hover:bg-civic/15"
          >
            {t('Refresh queue')}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-paper-line bg-white px-4 py-4 dark:border-board-line dark:bg-board"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                {t(metric.label)}
              </p>

              <p
                className={`mt-2 text-3xl font-semibold tracking-tight ${metric.tone}`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-5 rounded-lg border border-paper-line bg-white p-4 dark:border-board-line dark:bg-board">
          <div className="mb-3 md:hidden">
            <label
              htmlFor="mobile-complaint-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft"
            >
              {t('Search')}
            </label>

            <input
              id="mobile-complaint-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('Search grievances or citizens...')}
              className="w-full rounded-md border border-paper-line bg-paper-warm px-3 py-2.5 text-sm text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <div>
              <label
                htmlFor="status-filter"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft"
              >
                {t('Status')}
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${SELECT_CLASS} w-full`}
              >
                <option value="all">{t('All statuses')}</option>

                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(s.replace('_', ' '))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="department-filter"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft"
              >
                {t('Department')}
              </label>

              <select
                id="department-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className={`${SELECT_CLASS} w-full`}
              >
                <option value="all">{t('All departments')}</option>

                {departments.map((d) => (
                  <option key={d} value={d}>
                    {t(d)}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 self-end rounded-md border border-paper-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper-warm dark:border-board-line dark:hover:bg-board-line">
              <input
                type="checkbox"
                checked={flaggedOnly}
                onChange={(e) => setFlaggedOnly(e.target.checked)}
                className="h-4 w-4 accent-civic"
              />
              {t('Flagged only')}
            </label>
          </div>
        </div>

        {loading && <SkeletonRows rows={5} />}

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-stamp-red dark:border-red-900 dark:bg-red-950/30">
            {error}
          </p>
        )}

        {!loading && (
          <DataTable
            columns={COLUMNS}
            data={filtered}
            searchPredicate={(c, q) =>
              c.title.toLowerCase().includes(q) ||
              c.citizen_name.toLowerCase().includes(q)
            }
            searchPlaceholder="Search by title or citizen..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            hideSearch
            emptyState={
              <EmptyState
                icon="🔍"
                title="No complaints match these filters"
              />
            }
            renderRow={(c) => (
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className="cursor-pointer border-t border-paper-line transition-colors hover:bg-civic-soft/30 dark:border-board-line dark:hover:bg-civic/10"
              >
                <td className="min-w-52 px-4 py-3">
                  <p className="font-semibold text-civic dark:text-seal-green">
                    {c.title}
                  </p>

                  <p className="mt-1 text-xs text-ink-soft">
                    ID: CIV-{String(c.id).padStart(5, '0')}
                    {c.source_language === 'hi' && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                        {t('Hindi complaint — manual routing')}
                      </span>
                    )}
                  </p>
                </td>

                <td className="min-w-36 px-4 py-3 text-ink dark:text-paper">
                  {c.citizen_name}
                </td>

                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={c.department_id || ''}
                    onChange={(e) =>
                      handleReassignDepartment(c.id, e.target.value)
                    }
                    className={`${SELECT_CLASS} max-w-40`}
                    title={
                      c.assignment_source === 'image'
                        ? t('Experimental photo assignment; verify the photo before progressing.')
                      : c.assignment_source === 'text'
                        ? t('Text-based department suggestion; staff review')
                        : c.ai_category
                        ? `${t('Reassigned by staff')} (${t('AI suggested')}: ${c.ai_category})`
                        : t('Department assignment')
                    }
                  >
                    <option value="" disabled>
                      {t('Unassigned')}
                    </option>

                    {allDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-[11px] font-medium text-ink-soft dark:text-paper-muted">
                    {t('Assignment source')}: {t(
                      c.assignment_source === 'image'
                        ? 'Image model'
                        : c.assignment_source === 'staff'
                          ? 'Staff'
                          : c.department_id && c.ai_category
                            ? 'Complaint text model'
                            : 'Unassigned for review'
                    )}
                  </p>
                  {c.assignment_source === 'image' ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
                      {c.image_assignment_review_required ? t('Image-routed · verify photo') : t('Image routing reviewed')}
                    </span>
                  ) : c.assignment_source === 'staff' ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-paper-line bg-paper-warm px-2 py-0.5 text-[11px] font-medium text-ink-soft dark:border-board-line dark:bg-board">
                      {t('Staff Reassigned')}
                    </span>
                  ) : c.assignment_source === 'text' && c.department_id ? (
                    <span
                      className="ml-2 inline-flex items-center rounded-full border border-ai/25 bg-ai-soft px-2 py-0.5 text-[11px] font-medium text-ai dark:bg-ai/20"
                      title={t('Department selected using complaint title and description')}
                    >
                      {t('Text-routed · staff review')}
                    </span>
                  ) : c.assignment_source === 'unassigned' || !c.department_id ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-paper-line bg-paper-warm px-2 py-0.5 text-[11px] font-medium text-ink-soft dark:border-board-line dark:bg-board">
                      {t('Unassigned · manual review')}
                    </span>
                  ) : null}
                  {c.image_assignment_review_required && (
                    <div className="mt-1 max-w-48 text-[10px] leading-4 text-amber-800 dark:text-amber-200">
                      <p>{t('Review photo and report before assigning an officer or progressing.')}</p>
                      <button
                        type="button"
                        className="mt-1 rounded border border-amber-600 px-2 py-1 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60"
                        onClick={() => handleConfirmImageAssignment(c.id)}
                      >
                        {t('I reviewed the photo')}
                      </button>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <PriorityBadge priority={c.ai_priority} />
                  {c.source_language === 'hi' && (
                    <p className="mt-1 max-w-28 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                      {t('Unverified Hindi AI priority')}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3">
                  {c.sentiment ? (
                    <SentimentBadge sentiment={c.sentiment} />
                  ) : c.source_language === 'hi' ? (
                    <span className="text-xs text-ink-soft">{t('Not analyzed for Hindi')}</span>
                  ) : null}
                </td>

                <td className="px-4 py-3 font-mono text-ink-soft">
                  {c.estimated_resolution_label || (c.source_language === 'hi' ? t('Not estimated for Hindi') : '—')}
                </td>

                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={c.assigned_officer_id || ''}
                    disabled={c.image_assignment_review_required}
                    onChange={(e) =>
                      handleAssign(c.id, e.target.value)
                    }
                    className={`${SELECT_CLASS} max-w-36`}
                    title={c.image_assignment_review_required ? t('Review the photo before assigning an officer.') : undefined}
                  >
                    <option value="">{t('Unassigned')}</option>

                    {officers.filter((o) => o.status === 'active' && Number(o.department_id) === Number(c.department_id)).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {c.department_id && officers.every((o) => o.status !== 'active' || Number(o.department_id) !== Number(c.department_id)) && (
                    <p className="mt-1 max-w-40 text-[10px] leading-4 text-amber-800 dark:text-amber-200">
                      {t('No active officer is registered for this department. Ask an administrator to add one.')}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <FlagBadges complaint={c} t={t} />
                </td>

                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={c.status}
                    onChange={(e) =>
                      handleStatusChange(c.id, e.target.value)
                    }
                    className={`${SELECT_CLASS} max-w-36`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>

                  <span className="ml-2">
                    <StatusBadge status={c.status} />
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            )}
          />
        )}
      </PageTransition>

      {selected && (
        <div
          className="fixed inset-0 z-60 flex justify-end bg-black/50"
          onClick={() => setSelected(null)}
        >
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-lg overflow-y-auto border-l border-[#263750] bg-[#142238] p-6 text-[#f7fafc] shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[.18em] text-[#55e0ce]">
                  COMPLAINT #{selected.id}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {selected.title}
                </h2>

                <p className="mt-2 text-sm text-[#a6b6c8]">
                  {selected.location_text || 'Location not provided'} ·{' '}
                  {new Date(selected.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-[#a6b6c8] hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-7 space-y-5">
              <section className="rounded-xl bg-[#0b1424] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#a6b6c8]">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6">
                  {selected.description}
                </p>
              </section>

              {selected.source_language === 'hi' && (
                <section
                  className="rounded-xl border border-amber-400/50 bg-amber-950/30 p-4 text-amber-100"
                  role="note"
                >
                  <p className="text-sm font-semibold">
                    {t('Hindi AI results are experimental')}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-100/80">
                    {t('Verify the category and priority against the original Hindi complaint before taking action. Priority may be a fallback, not a validated Hindi prediction. Sentiment and resolution time are not generated for Hindi complaints.')}
                  </p>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3">
                <section className="rounded-xl border border-[#263750] p-4">
                  <p className="text-xs text-[#a6b6c8]">{t('Priority')}</p>

                  <div className="mt-2">
                    <PriorityBadge priority={selected.ai_priority} />
                  </div>
                </section>

                <section className="rounded-xl border border-[#263750] p-4">
                  <p className="text-xs text-[#a6b6c8]">{t('Status')}</p>

                  <div className="mt-2">
                    <StatusBadge status={selected.status} />
                  </div>
                </section>
              </div>

              <section>
                <label className="text-sm font-medium">
                  Update status
                </label>

                <select
                  value={selected.status}
                  onChange={(e) => {
                    const status = e.target.value;
                    handleStatusChange(selected.id, status);
                    setSelected({
                      ...selected,
                      status,
                    });
                  }}
                  className="mt-2 w-full rounded-lg border border-[#263750] bg-[#0b1424] p-3 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {t(s.replace('_', ' '))}
                    </option>
                  ))}
                </select>
              </section>

              <section>
                <label className="text-sm font-medium">
                  Assign officer
                </label>

                {selected.image_assignment_review_required && (
                  <div className="mt-2 rounded border border-amber-400/60 bg-amber-950/30 p-3 text-xs text-amber-100">
                    <p>{t('Review the photo and complaint before assigning an officer.')}</p>
                    <button
                      type="button"
                      className="mt-2 rounded border border-amber-300 px-2 py-1 font-semibold"
                      onClick={() => handleConfirmImageAssignment(selected.id)}
                    >
                      {t('I reviewed the photo')}
                    </button>
                  </div>
                )}

                <select
                  value={selected.assigned_officer_id || ''}
                  disabled={selected.image_assignment_review_required}
                  onChange={(e) => {
                    handleAssign(selected.id, e.target.value);
                  }}
                  className="mt-2 w-full rounded-lg border border-[#263750] bg-[#0b1424] p-3 text-sm"
                >
                  <option value="">{t('Unassigned')}</option>

                  {officers.filter((o) => o.status === 'active' && Number(o.department_id) === Number(selected.department_id)).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                {selected.department_id && officers.every((o) => o.status !== 'active' || Number(o.department_id) !== Number(selected.department_id)) && (
                  <p className="mt-1 text-xs text-amber-200">
                    {t('No active officer is registered for this department. Ask an administrator to add one.')}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-[#263750] p-4">
                <p className="text-xs text-[#a6b6c8]">
                  AI insights
                </p>

                <p className="mt-2 text-sm">
                  Category: {selected.ai_category || 'Unclassified'} ·
                  Sentiment: {selected.sentiment || 'Unavailable'}
                </p>

                <p className="mt-1 text-xs text-[#a6b6c8]">
                  AI suggestions support staff review and are not verified
                  facts.
                </p>
              </section>
            </div>
          </motion.aside>
        </div>
      )}
    </AdminShell>
  );
}

