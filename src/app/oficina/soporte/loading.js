export default function Loading() {
  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 space-y-2">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table Skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-panel rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-200 dark:border-dark-border">
                    <th className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 py-3 space-y-2">
                        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Panel Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 dark:bg-dark-bg rounded-2xl border border-dashed border-gray-200 dark:border-dark-border p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px] animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
