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
            className="w-full sm:w-72 px-3 py-2 text-sm border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper focus:outline-none focus:ring-2 focus:ring-brass placeholder:text-ink-soft"
          />
        </div>
      )}

      <div className="bg-white dark:bg-board border border-paper-line dark:border-board-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-warm dark:bg-board-line text-ink-soft text-left">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 font-medium text-xs uppercase tracking-wide ${col.className || ''}`}>
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
                      {emptyState || <p className="text-center text-ink-soft">No results.</p>}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-paper-line dark:border-board-line text-xs font-mono text-ink-soft">
            <span>
              Page {currentPage} of {totalPages} · {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-ink dark:border-paper-line text-ink dark:text-paper disabled:opacity-40 hover:bg-paper-warm dark:hover:bg-board-line"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border border-ink dark:border-paper-line text-ink dark:text-paper disabled:opacity-40 hover:bg-paper-warm dark:hover:bg-board-line"
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
