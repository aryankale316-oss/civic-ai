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
  searchValue,
  onSearchChange,
  hideSearch = false,
}) {
  const [internalQuery, setInternalQuery] = useState('');
  const [page, setPage] = useState(1);
  const query = searchValue ?? internalQuery;

  function handleSearchChange(value) {
    if (onSearchChange) onSearchChange(value);
    else setInternalQuery(value);
  }

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
      {searchPredicate && !hideSearch && (
        <div className="mb-3">
          <input
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full sm:w-80 rounded-md border border-paper-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-civic/30 dark:border-board-line dark:bg-board dark:text-paper"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-paper-line bg-white dark:border-board-line dark:bg-board">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-warm text-left text-ink-soft dark:bg-board-line">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${col.className || ''}`}>
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
          <div className="flex items-center justify-between border-t border-paper-line px-4 py-3 text-xs text-ink-soft dark:border-board-line">
            <span>
              Page {currentPage} of {totalPages} · {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-paper-line px-3 py-1.5 font-medium text-ink hover:bg-paper-warm disabled:opacity-40 dark:border-board-line dark:text-paper dark:hover:bg-board-line"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-paper-line px-3 py-1.5 font-medium text-ink hover:bg-paper-warm disabled:opacity-40 dark:border-board-line dark:text-paper dark:hover:bg-board-line"
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
