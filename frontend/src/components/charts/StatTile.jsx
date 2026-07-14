export default function StatTile({ label, value, note, unavailable, index = 0 }) {
  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {unavailable ? (
        <>
          <p className="text-lg font-semibold text-slate-300 dark:text-slate-600 mt-1">—</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{note}</p>
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
          {note && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{note}</p>}
        </>
      )}
    </div>
  );
}
