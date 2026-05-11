import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav title="Cargando Contacto..." subtitle="CRM" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-6xl w-full mx-auto">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Profile Card Skeleton */}
          <div className="glass-panel p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
            <div className="flex-shrink-0 w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            
            <div className="flex-1 w-full space-y-4">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex gap-3">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 glass-panel animate-pulse" />
            <div className="h-48 glass-panel animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
