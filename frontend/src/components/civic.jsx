import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * Shared "ticket board" visual primitives — see the design brief. These are
 * pure presentation components: no data fetching, no side effects beyond
 * StatusFlap's own flip animation.
 */

const TONE_CHIP = {
  brass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
  'flap-amber': 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800',
  'seal-green': 'bg-civic-soft text-civic border-civic/20 dark:bg-civic/20 dark:text-seal-green dark:border-seal-green/30',
  'stamp-red': 'bg-red-50 text-stamp-red border-red-200 dark:bg-red-950/40 dark:text-stamp-red dark:border-red-900',
  'ink-soft': 'bg-paper-warm text-ink-soft border-paper-line dark:bg-board-line dark:border-board-line',
};

// Border only — StampBadge text always stays high-contrast ink/paper
// (a tone-colored ring only needs to clear the 3:1 non-text UI-component
// bar, not the 4.5:1 body-text bar that colored label text would need).
const TONE_BORDER = {
  brass: 'border-brass',
  'flap-amber': 'border-flap-amber',
  'seal-green': 'border-seal-green',
  'stamp-red': 'border-stamp-red',
  'ink-soft': 'border-ink-soft',
};

/** Dashed-perforation stub used for complaints, report cards, process steps. */
export function TicketStub({ number, children, to, className = '' }) {
  const content = (
    <>
      {number != null && (
        <span className="absolute -top-2.5 left-3 bg-paper dark:bg-board px-1.5 font-mono text-[11px] font-medium text-stamp-red">
          № {number}
        </span>
      )}
      {children}
    </>
  );

  const classes = `ticket-stub relative block bg-white dark:bg-board px-4 py-4 ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return <div className={classes}>{content}</div>;
}

/** Notice-board card: thin hairline border + a pinned brass dot. */
export function NoticeCard({ children, className = '', pin = true, title, ...rest }) {
  return (
    <div
      className={`relative rounded-lg border border-paper-line bg-white px-5 py-5 dark:border-board-line dark:bg-board ${className}`}
      {...rest}
    >
      {pin && <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-brass border border-paper dark:border-board" />}
      {title && <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">{title}</h2>}
      {children}
    </div>
  );
}

/** Shared semantic chip used for status, priority, and sentiment values. */
export function StatusFlap({ label, tone = 'ink-soft', className = '' }) {
  const [playing, setPlaying] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPlaying(false);
    const frame = requestAnimationFrame(() => setPlaying(true));
    return () => cancelAnimationFrame(frame);
  }, [label, tone]);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide leading-none ${
        TONE_CHIP[tone] || TONE_CHIP['ink-soft']
      } ${
        playing ? 'flap-flip' : ''
      } ${className}`}
    >
      {label}
    </span>
  );
}

/** Circular rotated stamp — resolution confirmation / approval states. */
export function StampBadge({ label, tone = 'seal-green', size = 80, className = '' }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-full border-2 rotate-[-7deg] font-mono text-[11px] font-semibold uppercase tracking-wide text-center leading-tight px-2 text-ink dark:text-paper ${
        TONE_BORDER[tone] || TONE_BORDER['seal-green']
      } ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Bordered row of mono-number KPI cells, replacing the generic
 * card-with-icon stat tile pattern everywhere metrics are shown.
 * metrics: [{ label, value, note, unavailable, ratio? }]
 */
export function MetricRow({ metrics, className = '' }) {
  const { t } = useLanguage();
  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}
    >
      {metrics.map((m, i) => (
        <div key={i} className="rounded-lg border border-paper-line bg-white px-4 py-4 dark:border-board-line dark:bg-board sm:py-5">
          <p className="text-2xl font-semibold tracking-tight text-ink dark:text-paper">{m.unavailable ? '—' : m.value}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{t(m.label)}</p>
          {m.ratio != null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-warm dark:bg-board-line">
              <div
                className="h-1.5 rounded-full bg-civic transition-all duration-500"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, m.ratio)) * 100)}%` }}
              />
            </div>
          )}
          {m.note && <p className="text-[10px] text-ink-soft/80 mt-1">{t(m.note)}</p>}
        </div>
      ))}
    </div>
  );
}
