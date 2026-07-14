import { useState } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';

const REPORTS = [
  { type: 'complaints', title: 'Complaint Report', description: 'Full list of complaints with citizen, department, priority, status, and sentiment.', icon: '📋' },
  { type: 'departments', title: 'Department Report', description: 'Complaint volume, resolution counts, and average resolution time per department.', icon: '🏢' },
  { type: 'monthly', title: 'Monthly Report', description: 'Complaint volume and resolution counts for the last 12 months.', icon: '📅' },
  { type: 'analytics', title: 'Analytics Report', description: 'Summary KPIs plus top departments and categories.', icon: '📊' },
];

const FORMATS = [
  { format: 'csv', label: 'CSV', ext: 'csv' },
  { format: 'excel', label: 'Excel', ext: 'xlsx' },
  { format: 'pdf', label: 'PDF', ext: 'pdf' },
];

export default function AdminReports() {
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  async function handleDownload(type, format, ext) {
    const key = `${type}-${format}`;
    setError('');
    setDownloading(key);
    try {
      const res = await apiClient.get(`/reports/${type}`, { params: { format }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      const message = `Failed to generate the ${type} report.`;
      setError(message);
      toast.error(message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <PageTransition className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Reports</h1>

        {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORTS.map((report, i) => (
            <motion.div
              key={report.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{report.icon}</span>
                <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">{report.title}</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{report.description}</p>
              <div className="flex gap-2">
                {FORMATS.map((f) => {
                  const key = `${report.type}-${f.format}`;
                  return (
                    <button
                      key={f.format}
                      onClick={() => handleDownload(report.type, f.format, f.ext)}
                      disabled={downloading === key}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
                    >
                      {downloading === key ? '...' : f.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </PageTransition>
    </div>
  );
}
