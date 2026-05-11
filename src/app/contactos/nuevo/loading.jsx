import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="contact_btn_new" subtitleKey="nav_crm" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          <div className="glass-panel p-6 md:p-8">
            <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-6"></div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                    <div className="h-10 w-full bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                  </div>
                ))}
                
                <div className="md:col-span-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
                  <div className="flex gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-9 w-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
