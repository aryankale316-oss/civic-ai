import { useState } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { TicketStub } from '../components/civic';
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
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />
      <PageTransition className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Records office</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">Reports</h1>

        {error && <p className="text-stamp-red mb-4">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORTS.map((report, i) => (
            <motion.div
              key={report.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <TicketStub number={i + 1}>
                <div className="flex items-center gap-2 mb-1 mt-1">
                  <span className="text-lg">{report.icon}</span>
                  <h2 className="text-sm font-medium text-ink dark:text-paper">{report.title}</h2>
                </div>
                <p className="text-xs text-ink-soft mb-3">{report.description}</p>
                <div className="flex gap-2">
                  {FORMATS.map((f) => {
                    const key = `${report.type}-${f.format}`;
                    return (
                      <button
                        key={f.format}
                        onClick={() => handleDownload(report.type, f.format, f.ext)}
                        disabled={downloading === key}
                        className="px-3 py-1.5 text-xs font-medium border border-ink dark:border-paper-line text-ink dark:text-paper hover:bg-brass hover:border-brass hover:text-ink dark:hover:text-ink disabled:opacity-50 transition-colors"
                      >
                        {downloading === key ? '...' : f.label}
                      </button>
                    );
                  })}
                </div>
              </TicketStub>
            </motion.div>
          ))}
        </div>
      </PageTransition>
    </div>
  );
}
