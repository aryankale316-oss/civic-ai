import { useChartTheme } from './chartTheme';

export default function Meter({ label, ratio, valueLabel, index = 0 }) {
  const { sequentialBlue, isDark } = useChartTheme();
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  const trackColor = isDark ? 'rgba(57, 135, 229, 0.18)' : '#cde2fb';

  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1 mb-2">{valueLabel ?? `${pct}%`}</p>
      <div className="h-2 rounded-full" style={{ backgroundColor: trackColor }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: sequentialBlue }}
        />
      </div>
    </div>
  );
}
