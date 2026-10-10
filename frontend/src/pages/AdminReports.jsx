import { useState } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import AdminShell from '../components/AdminShell';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
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
      toast.success(t('Report downloaded'));
    } catch {
      const message = `Failed to generate the ${type} report.`;
      setError(message);
      toast.error(message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AdminShell>
      <PageTransition className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">{t('Records office')}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink dark:text-paper mb-2">{t('Reports & analytics')}</h1>
        <p className="mb-7 text-sm text-ink-soft">{t('Generate operational records in CSV, Excel, or PDF using current platform data.')}</p>

        {error && <p className="text-stamp-red mb-4">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORTS.map((report, i) => (
            <motion.div
              key={report.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <div className="h-full rounded-lg border border-paper-line bg-white p-5 dark:border-board-line dark:bg-board">
                <div className="flex items-center gap-2 mb-1 mt-1">
                  <span className="text-lg">{report.icon}</span>
                  <h2 className="text-sm font-medium text-ink dark:text-paper">{t(report.title)}</h2>
                </div>
                <p className="text-xs text-ink-soft mb-3">{t(report.description)}</p>
                <div className="flex gap-2">
                  {FORMATS.map((f) => {
                    const key = `${report.type}-${f.format}`;
                    return (
                      <button
                        key={f.format}
                        onClick={() => handleDownload(report.type, f.format, f.ext)}
                        disabled={downloading === key}
                        className="rounded-md border border-paper-line px-3 py-2 text-xs font-semibold text-civic transition-colors hover:border-civic hover:bg-civic-soft disabled:opacity-50 dark:border-board-line dark:text-seal-green dark:hover:bg-civic/15"
                      >
                        {downloading === key ? '...' : f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </PageTransition>
    </AdminShell>
  );
}
