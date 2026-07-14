export default function ChartCard({ title, subtitle, children, index = 0 }) {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{subtitle}</p>}
      <div className={subtitle ? 'mt-1' : 'mt-3'}>{children}</div>
    </div>
  );
}
