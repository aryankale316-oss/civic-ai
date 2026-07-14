export default function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div className={`relative overflow-hidden bg-paper-warm dark:bg-board-line ${className}`}>
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
    <div className="bg-white dark:bg-board border border-paper-line dark:border-board-line p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
    </div>
  );
}
