import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import AdminShell from '../components/AdminShell';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import { SkeletonRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { StatusFlap } from '../components/civic';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = { name: '', email: '', phone: '', department_id: '' };

const INPUT_CLASS = 'rounded-md border border-paper-line bg-white px-3 py-2.5 text-sm text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper';
const CELL_INPUT_CLASS = 'rounded-md border border-paper-line bg-white px-2 py-2 text-sm text-ink dark:border-board-line dark:bg-board-line dark:text-paper';

function PerformanceBadge({ score }) {
  if (score == null) return <span className="text-xs text-ink-soft">Not yet rated</span>;
  const tone = score >= 75 ? 'seal-green' : score >= 40 ? 'flap-amber' : 'stamp-red';
  return <StatusFlap label={`${score}%`} tone={tone} />;
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'workload', label: 'Active Workload' },
  { key: 'total', label: 'Total Assigned' },
  { key: 'performance', label: 'Performance' },
  { key: 'actions', label: 'Actions' },
];

export default function AdminOfficers() {
  const { t } = useLanguage();
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const toast = useToast();

  function loadOfficers() {
    setLoading(true);
    apiClient
      .get('/officers')
      .then(({ data }) => setOfficers(data))
      .catch(() => setError('Failed to load officers'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOfficers();
    apiClient.get('/departments').then(({ data }) => setDepartments(data)).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await apiClient.post('/officers', {
        ...form,
        department_id: form.department_id || null,
      });
      setForm(emptyForm);
      loadOfficers();
      toast.success('Officer added');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to add officer';
      setError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(officer) {
    setEditingId(officer.id);
    setEditForm({ name: officer.name, phone: officer.phone || '', department_id: officer.department_id || '', status: officer.status });
  }

  async function saveEdit(id) {
    try {
      await apiClient.patch(`/officers/${id}`, { ...editForm, department_id: editForm.department_id || null });
      setEditingId(null);
      loadOfficers();
      toast.success('Officer updated');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update officer';
      setError(message);
      toast.error(message);
    }
  }

  async function handleDelete(id) {
    const previous = officers;
    setOfficers((prev) => prev.filter((o) => o.id !== id));
    try {
      await apiClient.delete(`/officers/${id}`);
      toast.success('Officer removed');
    } catch {
      setOfficers(previous);
      toast.error('Failed to delete officer');
    }
  }

  return (
    <AdminShell>
      <PageTransition className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">{t('Field operations')}</p>
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink dark:text-paper">{t('Officer directory')}</h1>

        {error && <p className="text-stamp-red mb-4">{error}</p>}

        <form
          onSubmit={handleCreate}
          className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-paper-line bg-white p-5 dark:border-board-line dark:bg-board"
        >
          <div>
            <label className="block text-xs text-ink-soft mb-1">{t('Name')}</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">{t('Email')}</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">{t('Phone')}</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-soft mb-1">{t('Department')}</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="">{t('Unassigned')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{t(d.name)}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-civic px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-civic-bright disabled:opacity-50"
          >
            {creating ? t('Adding...') : t('Add Officer')}
          </button>
        </form>

        {loading && <SkeletonRows rows={4} />}

        {!loading && (
          <DataTable
            columns={COLUMNS}
            data={officers}
            searchPredicate={(o, q) => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)}
            searchPlaceholder={t('Search officers...')}
            emptyState={<EmptyState icon="👮" title="No officers added yet" />}
            renderRow={(o) => (
              <tr key={o.id} className="border-t border-paper-line dark:border-board-line hover:bg-paper-warm dark:hover:bg-board-line/40 transition-colors">
                <td className="px-4 py-3 font-medium text-ink dark:text-paper">
                  {editingId === o.id ? (
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className={`${CELL_INPUT_CLASS} w-full`}
                    />
                  ) : (
                    o.name
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{o.email}</td>
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <select
                      value={editForm.department_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, department_id: e.target.value }))}
                      className={CELL_INPUT_CLASS}
                    >
                      <option value="">{t('Unassigned')}</option>
                      {departments.map((d) => (
                      <option key={d.id} value={d.id}>{t(d.name)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-ink-soft">{o.department_name || 'Unassigned'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className={CELL_INPUT_CLASS}
                    >
                      <option value="active">{t('active')}</option>
                      <option value="inactive">{t('inactive')}</option>
                    </select>
                  ) : (
                    <StatusFlap label={o.status} tone={o.status === 'active' ? 'seal-green' : 'ink-soft'} />
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft font-mono">{o.active_workload}</td>
                <td className="px-4 py-3 text-ink-soft font-mono">{o.total_assigned}</td>
                <td className="px-4 py-3"><PerformanceBadge score={o.performance_score} /></td>
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(o.id)} className="text-xs text-seal-green hover:underline">{t('Save')}</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-ink-soft hover:underline">{t('Cancel')}</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(o)} className="text-xs text-ink-soft hover:underline">{t('Edit')}</button>
                      <button onClick={() => handleDelete(o.id)} className="text-xs text-stamp-red hover:underline">{t('Delete')}</button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </PageTransition>
    </AdminShell>
  );
}
