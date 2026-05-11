import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav title="Propiedades" subtitle="Portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-5xl w-full mx-auto space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>

          {/* Photo Gallery Skeleton */}
          <div className="glass-panel rounded-2xl overflow-hidden h-64 animate-pulse" />

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 glass-panel animate-pulse" />
              <div className="h-64 glass-panel animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-48 glass-panel animate-pulse" />
              <div className="h-48 glass-panel animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
