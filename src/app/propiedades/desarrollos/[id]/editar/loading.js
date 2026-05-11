import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="dev_edit_title" subtitleKey="dev_subtitle" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Form Card Skeleton */}
          <div className="glass-panel rounded-[24px] p-6 md:p-8 space-y-8 animate-pulse">
            {[1, 2, 3, 4].map((section) => (
              <div key={section} className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                </div>
              </div>
            ))}
            
            <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
              <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
