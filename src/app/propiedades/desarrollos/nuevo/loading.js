import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="dev_new_title" subtitleKey="dev_new_subtitle" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          <div className="glass-panel rounded-[24px] p-6 md:p-8 space-y-8">
            {[...Array(4)].map((_, sectionIndex) => (
              <div key={sectionIndex}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
                  <div className="w-48 h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={sectionIndex === 0 ? "md:col-span-2" : ""}>
                    <div className="w-32 h-3 bg-gray-200 dark:bg-slate-700 rounded mb-2 animate-pulse"></div>
                    <div className="w-full h-11 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse"></div>
                  </div>
                  <div>
                    <div className="w-32 h-3 bg-gray-200 dark:bg-slate-700 rounded mb-2 animate-pulse"></div>
                    <div className="w-full h-11 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
