import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared "ticket board" visual primitives — see the design brief. These are
 * pure presentation components: no data fetching, no side effects beyond
 * StatusFlap's own flip animation.
 */

const TONE_BAR = {
  brass: 'bg-brass',
  'flap-amber': 'bg-flap-amber',
  'seal-green': 'bg-seal-green',
  'stamp-red': 'bg-stamp-red',
  'ink-soft': 'bg-ink-soft',
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
      className={`relative bg-white dark:bg-board border border-paper-line dark:border-board-line px-4 py-4 ${className}`}
      {...rest}
    >
      {pin && <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 rounded-full bg-brass border border-paper dark:border-board" />}
      {title && <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">{title}</h2>}
      {children}
    </div>
  );
}

/**
 * The single rendering path for every status/priority/sentiment badge in
 * the app. Always a dark "board" chip (per spec) with a tone bar on the
 * left edge; plays the split-flap animation whenever its label changes.
 */
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
      className={`relative inline-flex items-center pl-3 pr-2 py-0.5 bg-board text-paper border border-board-line font-mono text-[11px] uppercase tracking-wide leading-normal ${
        playing ? 'flap-flip' : ''
      } ${className}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${TONE_BAR[tone] || TONE_BAR['ink-soft']}`} />
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
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 border-t border-b border-paper-line dark:border-board-line divide-x divide-y sm:divide-y-0 divide-paper-line dark:divide-board-line ${className}`}
    >
      {metrics.map((m, i) => (
        <div key={i} className="px-4 py-4 sm:py-5">
          <p className="font-mono text-2xl text-ink dark:text-paper">{m.unavailable ? '—' : m.value}</p>
          <p className="text-[11px] uppercase tracking-wide text-ink-soft mt-1">{m.label}</p>
          {m.ratio != null && (
            <div className="h-1 bg-paper-warm dark:bg-board-line mt-2">
              <div
                className="h-1 bg-brass transition-all duration-500"
                style={{ width: `${Math.round(Math.max(0, Math.min(1, m.ratio)) * 100)}%` }}
              />
            </div>
          )}
          {m.note && <p className="text-[10px] text-ink-soft/80 mt-1">{m.note}</p>}
        </div>
      ))}
    </div>
  );
}
