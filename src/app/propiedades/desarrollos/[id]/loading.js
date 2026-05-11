import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="dev_detail_title" subtitleKey="dev_subtitle" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg overflow-y-auto w-full">
        {/* Header Section Skeleton */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-dark-border px-4 md:px-8 pt-6 pb-0 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div className="space-y-3">
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                </div>
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="h-10 w-36 bg-emerald-200 dark:bg-emerald-900/30 rounded-xl animate-pulse" />
              </div>
            </div>

            <div className="flex gap-6 -mb-px overflow-x-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="pb-3 border-b-2 border-transparent">
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area Skeleton */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-panel rounded-2xl p-4 h-96 animate-pulse" />
            </div>
            <div className="lg:col-span-3">
              <div className="glass-panel rounded-2xl h-[600px] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
