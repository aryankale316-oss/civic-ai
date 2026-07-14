const PRIORITY_STYLES = {
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

const STATUS_STYLES = {
  submitted: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

const SENTIMENT_STYLES = {
  Positive: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  Neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  Negative: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

const DEFAULT_STYLE = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';

export function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority] || DEFAULT_STYLE}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || DEFAULT_STYLE}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SENTIMENT_STYLES[sentiment] || DEFAULT_STYLE}`}>
      {sentiment}
    </span>
  );
}
