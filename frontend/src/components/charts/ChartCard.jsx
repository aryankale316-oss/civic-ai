import { NoticeCard } from '../civic';

export default function ChartCard({ title, subtitle, children, index = 0 }) {
  return (
    <NoticeCard pin={false} className="animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
      <h2 className="text-lg font-semibold tracking-tight text-ink dark:text-paper">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-ink-soft">{subtitle}</p>}
      <div className={subtitle ? 'mt-4' : 'mt-5'}>{children}</div>
    </NoticeCard>
  );
}
