/* ═══════════════════════════════════════════════════════════════
   ROOT LOADING — Shown while Server Components fetch data.
   
   Renders a pulse-animated skeleton that matches the app's
   layout structure (TopNav + content area).
   ═══════════════════════════════════════════════════════════════ */

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-dark-bg animate-pulse">
      {/* TopNav skeleton */}
      <div className="h-16 border-b border-gray-100 dark:border-dark-border flex items-center px-6 gap-4">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-56 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 md:p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-dark-panel rounded-2xl border border-gray-100 dark:border-dark-border" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white dark:bg-dark-panel rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
          <div className="h-12 bg-slate-50 dark:bg-[#1a2332] border-b border-gray-100 dark:border-dark-border" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 border-b border-gray-50 dark:border-dark-border flex items-center px-6 gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3 w-48 bg-gray-50 dark:bg-gray-800/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
