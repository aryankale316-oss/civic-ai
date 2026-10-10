import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';
import { useLanguage } from '../context/LanguageContext';

export default function AdminDepartments() {
  const { t } = useLanguage();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const load = () => apiClient.get('/departments').then(({ data }) => setItems(data)).catch(() => setError(t('Failed to load departments')));
  useEffect(() => { load(); }, []);
  const handleError = (err, fallback) => { const message = t(err.response?.data?.error || fallback); setError(message); toast.error(message); };
  async function create(e) { e.preventDefault(); try { await apiClient.post('/departments', { name }); setName(''); load(); toast.success(t('Department created')); } catch (err) { handleError(err, 'Failed to create department'); } }
  async function save(id) { try { await apiClient.patch(`/departments/${id}`, { name: editing.name }); setEditing(null); load(); toast.success(t('Department updated')); } catch (err) { handleError(err, 'Failed to update department'); } }
  async function remove(id) { if (!window.confirm(t('Delete this department? Linked records must be reassigned first.'))) return; try { await apiClient.delete(`/departments/${id}`); load(); toast.success(t('Department deleted')); } catch (err) { handleError(err, 'Failed to delete department'); } }
  return <div className="min-h-screen bg-paper dark:bg-board"><Navbar /><PageTransition className="max-w-3xl mx-auto px-6 py-8">
    <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">{t('Administration')}</p><h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">{t('Departments')}</h1>
    {error && <p className="text-stamp-red text-sm mb-4">{error}</p>}
    <form onSubmit={create} className="flex gap-2 mb-6"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('New department name')} className="flex-1 px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper text-sm" /><button className="px-4 py-2 bg-ink text-paper text-sm">{t('Add department')}</button></form>
    <div className="bg-white dark:bg-board border border-paper-line dark:border-board-line divide-y divide-paper-line dark:divide-board-line">{items.map((item) => <div key={item.id} className="flex items-center gap-3 p-4"><div className="flex-1">{editing?.id === item.id ? <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-2 py-1 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper" /> : <span className="text-ink dark:text-paper">{t(item.name)}</span>}</div>{editing?.id === item.id ? <><button onClick={() => save(item.id)} className="text-seal-green text-sm">{t('Save')}</button><button onClick={() => setEditing(null)} className="text-ink-soft text-sm">{t('Cancel')}</button></> : <><button onClick={() => setEditing(item)} className="text-ink dark:text-paper underline text-sm">{t('Edit')}</button><button onClick={() => remove(item.id)} className="text-stamp-red underline text-sm">{t('Delete')}</button></>}</div>)}</div>
  </PageTransition></div>;
}
