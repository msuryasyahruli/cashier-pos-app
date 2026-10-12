import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface Column<T> {
  header: React.ReactNode;
  key?: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: React.ReactNode;
  className?: string;
  keyExtractor?: (row: T, index: number) => string | number;
}

export function Table<T>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  keyExtractor,
}: TableProps<T>) {
  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  const renderCellContent = (row: T, col: Column<T>) => {
    if (col.accessor) {
      if (typeof col.accessor === 'function') {
        return col.accessor(row);
      }
      return row[col.accessor] as React.ReactNode;
    }
    if (col.key && col.key in (row as any)) {
      return (row as any)[col.key];
    }
    return null;
  };

  const getRowKey = (row: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(row, index);
    if ((row as any).id !== undefined) return (row as any).id;
    if ((row as any).key !== undefined) return (row as any).key;
    return index;
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/60 uppercase font-semibold tracking-wider">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`py-3 px-4 ${getAlignmentClass(col.align)} ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-10 text-slate-500 font-medium"
              >
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw
                    size={16}
                    className="animate-spin text-indigo-600"
                  />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-slate-400 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick
                    ? 'hover:bg-slate-50/80 cursor-pointer'
                    : 'hover:bg-slate-50/70'
                }`}
                title={onRowClick ? 'Click to view details' : undefined}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`py-3.5 px-4 ${getAlignmentClass(col.align)} ${col.className || ''}`}
                  >
                    {renderCellContent(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
