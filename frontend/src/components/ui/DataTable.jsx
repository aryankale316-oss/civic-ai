import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE_DEFAULT = 10;

export default function DataTable({
  columns,
  data,
  renderRow,
  searchPredicate,
  searchPlaceholder = 'Search...',
  pageSize = PAGE_SIZE_DEFAULT,
  emptyState,
  colSpan,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchPredicate) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => searchPredicate(row, q));
  }, [data, query, searchPredicate]);

  useEffect(() => {
    setPage(1);
  }, [query, data.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {searchPredicate && (
        <div className="mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full sm:w-72 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 placeholder:text-slate-400"
          />
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-left">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 font-medium ${col.className || ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length > 0
                ? paged.map((row) => renderRow(row))
                : (
                  <tr>
                    <td colSpan={colSpan || columns.length} className="px-4 py-10">
                      {emptyState || <p className="text-center text-slate-400">No results.</p>}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page {currentPage} of {totalPages} · {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40 hover:border-slate-400 dark:hover:border-slate-500"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40 hover:border-slate-400 dark:hover:border-slate-500"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
