import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import { TicketStub } from '../components/civic';
import { SkeletonRows } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import FloatingActionButton from '../components/ui/FloatingActionButton';
import PageTransition from '../components/ui/PageTransition';

export default function CitizenDashboard() {
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
      <PageTransition className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft font-mono">Ticket window</p>
            <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper">My Complaints</h1>
          </div>
          <Link
            to="/complaints/new"
            className="hidden sm:inline-block px-4 py-2 bg-ink text-paper text-sm hover:bg-ink/90 transition-colors"
          >
            + New Complaint
          </Link>
        </div>

        {!loading && !error && (() => {
          const count = (status) => complaints.filter((c) => c.status === status).length;
          return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[['Total reports', complaints.length, 'bg-[#0b1424] text-white'], ['Pending', count('submitted'), 'bg-amber-50 text-amber-800'], ['In progress', count('in_progress'), 'bg-blue-50 text-blue-800'], ['Resolved', count('resolved'), 'bg-emerald-50 text-emerald-800']].map(([label, value, tone]) => <div key={label} className={`rounded-2xl p-5 border border-paper-line shadow-sm ${tone}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
          </div>;
        })()}

        {loading && <SkeletonRows rows={4} />}
        {error && <p className="text-stamp-red">{error}</p>}

        {!loading && !error && complaints.length === 0 && (
          <EmptyState
            icon="📭"
            title="No complaints yet"
            description="Submit your first complaint and we'll classify, route, and track it for you."
            action={
              <Link to="/complaints/new" className="px-4 py-2 bg-ink text-paper text-sm hover:bg-ink/90">
                Submit a complaint
              </Link>
            }
          />
        )}

        <div className="space-y-4">
          {complaints.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <TicketStub number={c.id} to={`/complaints/${c.id}`} className="hover:border-brass transition-colors">
                <div className="flex items-center justify-between mb-1 mt-1">
                  <h2 className="font-medium text-ink dark:text-paper">{c.title}</h2>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-ink-soft line-clamp-2 mb-2">{c.description}</p>
                <div className="flex items-center gap-2 text-xs text-ink-soft font-mono">
                  {c.department_name && <span>{c.department_name}</span>}
                  <PriorityBadge priority={c.ai_priority} />
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </TicketStub>
            </motion.div>
          ))}
        </div>
      </PageTransition>

      <FloatingActionButton to="/complaints/new" icon="+" label="New Complaint" />
    </div>
  );
}
