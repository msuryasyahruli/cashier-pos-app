import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = "",
  disabled = false,
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems === 0) && !onPageSizeChange) {
    return null;
  }

  // Calculate visible range of items
  const startItem =
    totalItems !== undefined && pageSize !== undefined && totalItems > 0
      ? (currentPage - 1) * pageSize + 1
      : null;
  const endItem =
    totalItems !== undefined && pageSize !== undefined && totalItems > 0
      ? Math.min(currentPage * pageSize, totalItems)
      : null;

  // Generate numbered pages window (e.g. 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 ${className}`}
    >
      {/* Information text */}
      <div className="flex items-center gap-3">
        {totalItems !== undefined ? (
          <span>
            Showing <span className="font-semibold text-slate-800">{startItem ?? 0}</span> to{" "}
            <span className="font-semibold text-slate-800">{endItem ?? 0}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalItems}</span> results
          </span>
        ) : (
          <span>
            Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages || 1}</span>
          </span>
        )}

        {/* Rows per page selector */}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={disabled}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First page"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1 px-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={disabled}
                className={`min-w-7 h-7 px-2 rounded-lg font-medium transition-colors text-xs ${
                  currentPage === p
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                } disabled:cursor-not-allowed`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

