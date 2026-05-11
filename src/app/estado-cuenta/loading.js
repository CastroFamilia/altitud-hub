import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav title="Estado de Cuenta" subtitle="Tus finanzas y cobros de la oficina" />
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg p-4 md:p-8 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto space-y-8 w-full">
          {/* Widgets Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden animate-pulse">
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
              <div className="h-3 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-40 bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 relative animate-pulse">
              <div className="h-3 w-40 bg-slate-700 rounded mb-4" />
              <div className="h-10 w-32 bg-slate-700 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-slate-700 rounded" />
                <div className="h-8 w-40 bg-slate-700 rounded" />
              </div>
            </div>
          </div>

          {/* Transactions List Skeleton */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden h-96 animate-pulse">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="p-6 space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
