import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartTheme } from './chartTheme';
import { useLanguage } from '../../context/LanguageContext';

export default function CategoryForecastChart({ data, height = 300 }) {
  const { ink, tooltipStyle, cursorFill, sequentialBlue, isDark } = useChartTheme();
  const { t } = useLanguage();
  const chartData = (data || [])
    .filter((row) => row.predicted_count != null)
    .map((row) => ({
      ...row,
      recent_average: Number(row.recent_average),
      predicted_count: Number(row.predicted_count),
      department: t(row.department),
    }));

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-soft">{t('Not enough category history for forecasts yet.')}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 18, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={ink.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="department" tick={{ fill: ink.secondary, fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={58} />
        <YAxis allowDecimals={false} tick={{ fill: ink.muted, fontSize: 12 }} axisLine={false} />
        <Tooltip cursor={{ fill: cursorFill }} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: isDark ? '#eef0ea' : '#1c2b45', fontSize: 12 }} />
        <Bar dataKey="recent_average" name={t('Recent 3-month average')} fill={ink.muted} radius={[3, 3, 0, 0]} />
        <Bar dataKey="predicted_count" name={t('Forecast')} fill={sequentialBlue} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
