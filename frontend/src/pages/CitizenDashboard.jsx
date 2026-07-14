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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <PageTransition className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">My Complaints</h1>
          <Link
            to="/complaints/new"
            className="hidden sm:inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity text-sm shadow-sm"
          >
            + New Complaint
          </Link>
        </div>

        {loading && <SkeletonRows rows={4} />}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

        {!loading && !error && complaints.length === 0 && (
          <EmptyState
            icon="📭"
            title="No complaints yet"
            description="Submit your first complaint and we'll classify, route, and track it for you."
            action={
              <Link to="/complaints/new" className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm hover:opacity-90">
                Submit a complaint
              </Link>
            }
          />
        )}

        <div className="space-y-3">
          {complaints.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <Link
                to={`/complaints/${c.id}`}
                className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-medium text-slate-900 dark:text-slate-100">{c.title}</h2>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{c.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {c.department_name && <span>{c.department_name}</span>}
                  <PriorityBadge priority={c.ai_priority} />
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
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
