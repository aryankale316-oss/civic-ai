import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';
import DataTable from '../components/ui/DataTable';
import { SkeletonRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const emptyForm = { name: '', email: '', phone: '', department_id: '' };

const INPUT_CLASS = 'px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md text-sm';
const CELL_INPUT_CLASS = 'px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded text-sm';

function PerformanceBadge({ score }) {
  if (score == null) return <span className="text-xs text-slate-400 dark:text-slate-500">Not yet rated</span>;
  const style =
    score >= 75
      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
      : score >= 40
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>{score}%</span>;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <PageTransition className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Officers</h1>

        {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}

        <form
          onSubmit={handleCreate}
          className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Department</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {creating ? 'Adding...' : 'Add Officer'}
          </button>
        </form>

        {loading && <SkeletonRows rows={4} />}

        {!loading && (
          <DataTable
            columns={COLUMNS}
            data={officers}
            searchPredicate={(o, q) => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)}
            searchPlaceholder="Search officers..."
            emptyState={<EmptyState icon="👮" title="No officers added yet" />}
            renderRow={(o) => (
              <tr key={o.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
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
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.email}</td>
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <select
                      value={editForm.department_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, department_id: e.target.value }))}
                      className={CELL_INPUT_CLASS}
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">{o.department_name || 'Unassigned'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className={CELL_INPUT_CLASS}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {o.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.active_workload}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.total_assigned}</td>
                <td className="px-4 py-3"><PerformanceBadge score={o.performance_score} /></td>
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(o.id)} className="text-xs text-green-700 dark:text-green-400 hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(o)} className="text-xs text-slate-600 dark:text-slate-400 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(o.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          />
        )}
      </PageTransition>
    </div>
  );
}
