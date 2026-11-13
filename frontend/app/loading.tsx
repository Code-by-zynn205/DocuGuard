export default function GlobalLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8"
      aria-busy="true"
      aria-label="Đang tải dữ liệu"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* 4 StatCard Skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-36 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>

      {/* Middle Panels Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 h-72 animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90" />
        <div className="lg:col-span-5 h-72 animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90" />
      </div>

      {/* DataTable Skeleton */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3.5">
          <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-between gap-4 pt-3 first:pt-0">
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
