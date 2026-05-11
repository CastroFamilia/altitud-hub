import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="contact_imp_title" subtitleKey="nav_crm" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-4xl w-full mx-auto">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <span className="text-gray-400">/</span>
            <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>

          <div className="glass-panel p-6 md:p-8">
            <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-dark-border">
              <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="flex gap-2 items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="w-8 h-px bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
              </div>
            </div>
            
            <div className="h-24 w-full bg-gray-200 dark:bg-slate-700 rounded-2xl animate-pulse mb-6"></div>
            
            <div className="flex flex-col items-center justify-center space-y-6 py-12">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse"></div>
              <div className="h-6 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="flex gap-3">
                <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
