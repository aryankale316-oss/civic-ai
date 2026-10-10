import { StatusFlap } from './civic';
import { useLanguage } from '../context/LanguageContext';

const PRIORITY_TONES = {
  Low: 'ink-soft',
  Medium: 'brass',
  High: 'flap-amber',
  Critical: 'stamp-red',
};

const STATUS_TONES = {
  submitted: 'brass',
  in_progress: 'flap-amber',
  resolved: 'seal-green',
  rejected: 'stamp-red',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const SENTIMENT_TONES = {
  Positive: 'seal-green',
  Neutral: 'ink-soft',
  Negative: 'stamp-red',
};

export function PriorityBadge({ priority }) {
  const { t } = useLanguage();
  if (!priority) return null;
  return <StatusFlap label={t(priority)} tone={PRIORITY_TONES[priority] || 'ink-soft'} />;
}

export function StatusBadge({ status }) {
  const { t } = useLanguage();
  return <StatusFlap label={t(STATUS_LABELS[status] || status)} tone={STATUS_TONES[status] || 'ink-soft'} />;
}

export function SentimentBadge({ sentiment }) {
  const { t } = useLanguage();
  if (!sentiment) return null;
  return <StatusFlap label={t(sentiment)} tone={SENTIMENT_TONES[sentiment] || 'ink-soft'} />;
}
