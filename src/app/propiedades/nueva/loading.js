import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav titleKey="nav_properties" subtitleKey="nav_portfolio" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-3xl w-full mx-auto">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Form Container Skeleton */}
          <div className="glass-panel p-6 md:p-8 rounded-2xl animate-pulse">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>

            <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
