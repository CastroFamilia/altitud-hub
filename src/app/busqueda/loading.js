import TopNav from '@/components/layout/TopNav';

export default function Loading() {
  return (
    <>
      <TopNav title="BÚSQUEDA" subtitle="Matchmaking Inmobiliario" />
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-8">
        <div className="animate-spin w-8 h-8 border-2 border-nexus-blue border-t-transparent rounded-full"></div>
      </div>
    </>
  );
}
