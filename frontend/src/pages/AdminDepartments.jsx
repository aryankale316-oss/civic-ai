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
  const [error, setError] = useState('');
  const load = () => apiClient.get('/departments').then(({ data }) => setItems(data)).catch(() => setError(t('Failed to load departments')));
  useEffect(() => { load(); }, []);
  const handleError = (err, fallback) => { const message = t(err.response?.data?.error || fallback); setError(message); toast.error(message); };
  return <div className="min-h-screen bg-paper dark:bg-board"><Navbar /><PageTransition className="max-w-3xl mx-auto px-6 py-8">
    <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">{t('Administration')}</p><h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">{t('Departments')}</h1>
    {error && <p className="text-stamp-red text-sm mb-4">{error}</p>}
    <p className="text-sm text-ink-soft mb-4">{t('The platform uses six fixed departments so complaint routing and training labels stay aligned.')}</p>
    <div className="bg-white dark:bg-board border border-paper-line dark:border-board-line divide-y divide-paper-line dark:divide-board-line">{items.map((item) => <div key={item.id} className="flex items-center gap-3 p-4"><span className="text-ink dark:text-paper">{t(item.name)}</span></div>)}</div>
  </PageTransition></div>;
}
