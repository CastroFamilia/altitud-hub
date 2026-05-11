import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="dev_title" subtitleKey="dev_page_subtitle" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-7xl w-full mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-panel p-3 rounded-xl text-center animate-pulse">
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 mx-auto rounded mb-2" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 mx-auto rounded" />
              </div>
            ))}
          </div>

          {/* Controls Skeleton */}
          <div className="glass-panel rounded-2xl p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="h-10 w-full md:w-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="glass-panel rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
