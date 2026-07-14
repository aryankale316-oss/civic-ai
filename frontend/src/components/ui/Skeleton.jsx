export default function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}>
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
    </div>
  );
}
