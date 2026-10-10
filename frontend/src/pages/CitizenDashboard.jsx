import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { SkeletonRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import FloatingActionButton from '../components/ui/FloatingActionButton';
import PageTransition from '../components/ui/PageTransition';
import { useLanguage } from '../context/LanguageContext';

export default function CitizenDashboard() {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/complaints')
      .then(({ data }) => setComplaints(data))
      .catch(() => setError('Failed to load complaints'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />
      <PageTransition className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">{t('Citizen dashboard')}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink dark:text-paper">{t('My complaints')}</h1>
            <p className="mt-2 text-sm text-ink-soft">{t('Track every report from submission through resolution.')}</p>
          </div>
          <Link
            to="/complaints/new"
            className="hidden rounded-md bg-civic px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-civic-bright sm:inline-block"
          >
            {t('New complaint')}
          </Link>
        </div>

        {!loading && !error && (() => {
          const count = (status) => complaints.filter((c) => c.status === status).length;
          return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[['Total reports', complaints.length, 'bg-[#0b1424] text-white'], ['Pending', count('submitted'), 'bg-amber-50 text-amber-800'], ['In progress', count('in_progress'), 'bg-blue-50 text-blue-800'], ['Resolved', count('resolved'), 'bg-emerald-50 text-emerald-800']].map(([label, value, tone]) => <div key={label} className={`rounded-2xl p-5 border border-paper-line shadow-sm ${tone}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-70">{t(label)}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
          </div>;
        })()}

        {loading && <SkeletonRows rows={4} />}
        {error && <p className="text-stamp-red">{t(error)}</p>}

        {!loading && !error && complaints.length === 0 && (
          <EmptyState
            icon="📭"
            title={t('No complaints yet')}
            description={t("Submit your first complaint and we'll classify, route, and track it for you.")}
            action={
              <Link to="/complaints/new" className="px-4 py-2 bg-ink text-paper text-sm hover:bg-ink/90">
                {t('Submit a complaint')}
              </Link>
            }
          />
        )}

        {complaints.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t('Total'), complaints.length],
              [t('Submitted'), complaints.filter((c) => c.status === 'submitted').length],
              [t('In progress'), complaints.filter((c) => c.status === 'in_progress').length],
              [t('Resolved'), complaints.filter((c) => c.status === 'resolved').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-paper-line bg-white p-4 dark:border-board-line dark:bg-board">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-ink dark:text-paper">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {complaints.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Link to={`/complaints/${c.id}`} className="block rounded-lg border border-paper-line bg-white p-5 transition-colors hover:border-civic/50 hover:bg-civic-soft/20 dark:border-board-line dark:bg-board dark:hover:bg-civic/10">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-civic dark:text-seal-green">CIV-{String(c.id).padStart(5, '0')}</p>
                    <h2 className="font-semibold text-ink dark:text-paper">{c.title}</h2>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mb-4 line-clamp-2 text-sm leading-6 text-ink-soft">{c.description}</p>
                <div className="flex flex-wrap items-center gap-2 border-t border-paper-line pt-3 text-xs text-ink-soft dark:border-board-line">
                  {c.department_name && <span>{c.department_name}</span>}
                  <PriorityBadge priority={c.ai_priority} />
                  <span className="ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </PageTransition>

      <FloatingActionButton to="/complaints/new" icon="+" label="New Complaint" />
    </div>
  );
}
