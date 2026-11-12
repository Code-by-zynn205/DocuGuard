'use client';

import React, { useMemo, useState } from 'react';
import { Filter, Inbox, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  accessor?: (row: T) => string | number | boolean | null | undefined;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableFilterOption {
  label: string;
  value: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey?: (row: T, index: number) => string;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  searchPredicate?: (row: T, query: string) => boolean;
  filterLabel?: string;
  filterKey?: keyof T;
  filterOptions?: DataTableFilterOption[];
  filterPredicate?: (row: T, filterValue: string) => boolean;
  toolbarRight?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchKeys,
  searchPredicate,
  filterLabel = 'Trạng thái',
  filterKey,
  filterOptions,
  filterPredicate,
  toolbarRight,
  emptyTitle = 'Không có dữ liệu phù hợp',
  emptyDescription = 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.',
  emptyIcon,
  emptyAction,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredData = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return data.filter((row) => {
      if (selectedFilter !== 'all') {
        if (filterPredicate) {
          if (!filterPredicate(row, selectedFilter)) return false;
        } else if (filterKey) {
          const val = row[filterKey];
          if (String(val ?? '') !== selectedFilter) return false;
        }
      }

      if (normalizedQuery) {
        if (searchPredicate) {
          return searchPredicate(row, normalizedQuery);
        }

        if (searchKeys && searchKeys.length > 0) {
          return searchKeys.some((key) => {
            const val = row[key];
            return String(val ?? '').toLowerCase().includes(normalizedQuery);
          });
        }

        return columns.some((col) => {
          if (col.accessor) {
            return String(col.accessor(row) ?? '')
              .toLowerCase()
              .includes(normalizedQuery);
          }
          const raw = (row as Record<string, unknown>)[col.key];
          if (
            typeof raw === 'string' ||
            typeof raw === 'number' ||
            typeof raw === 'boolean'
          ) {
            return String(raw).toLowerCase().includes(normalizedQuery);
          }
          return false;
        });
      }

      return true;
    });
  }, [
    data,
    searchQuery,
    selectedFilter,
    filterPredicate,
    filterKey,
    searchPredicate,
    searchKeys,
    columns,
  ]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
  };

  const resolveRowKey = (row: T, index: number): string => {
    if (rowKey) return rowKey(row, index);
    const record = row as Record<string, unknown>;
    if (typeof record._id === 'string') return record._id;
    if (typeof record.id === 'string') return record.id;
    return String(index);
  };

  return (
    <div
      className={[
        'overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Toolbar: Search + Filter + Extra Actions */}
      {(searchable || (filterOptions && filterOptions.length > 0) || toolbarRight) && (
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {searchable && (
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {filterOptions && filterOptions.length > 0 && (
              <div className="relative flex items-center">
                <Filter
                  className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  aria-label={`Lọc theo ${filterLabel}`}
                  className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 pl-8 pr-7 text-sm text-slate-700 dark:text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                >
                  <option value="all">{filterLabel}: Tất cả</option>
                  {filterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="h-3.5 w-3.5" />}
              >
                Đặt lại
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {loading
                ? 'Đang tải...'
                : `${filteredData.length} / ${data.length} bản ghi`}
            </span>
            {toolbarRight}
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap ${ALIGN_CLASS[col.align ?? 'left']}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                      {emptyIcon ?? <Inbox className="h-6 w-6" />}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {emptyTitle}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {emptyDescription}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      {hasActiveFilters && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={resetFilters}
                        >
                          Xóa bộ lọc
                        </Button>
                      )}
                      {emptyAction}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                <tr
                  key={resolveRowKey(row, rowIdx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    'transition-colors',
                    onRowClick
                      ? 'cursor-pointer hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  {columns.map((col) => {
                    const fallbackValue = col.accessor
                      ? col.accessor(row)
                      : (row as Record<string, unknown>)[col.key];

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 text-slate-700 dark:text-slate-200 ${ALIGN_CLASS[col.align ?? 'left']}`}
                      >
                        {col.render
                          ? col.render(row, rowIdx)
                          : (fallbackValue as React.ReactNode) ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
