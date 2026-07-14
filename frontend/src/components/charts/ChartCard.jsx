import { NoticeCard } from '../civic';

export default function ChartCard({ title, subtitle, children, index = 0 }) {
  return (
    <NoticeCard className="animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
      <h2 className="text-sm font-medium text-ink dark:text-paper">{title}</h2>
      {subtitle && <p className="text-xs text-ink-soft mb-1">{subtitle}</p>}
      <div className={subtitle ? 'mt-1' : 'mt-3'}>{children}</div>
    </NoticeCard>
  );
}
