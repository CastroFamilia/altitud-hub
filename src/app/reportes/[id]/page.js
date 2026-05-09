import { Suspense } from 'react';
import ReportClient from './ReportClient';

export const metadata = {
  title: 'Performance Report — RE/MAX Altitud',
  description: 'Development marketing performance report',
};

export default async function ReportPage({ params }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <ReportClient params={params} />
    </Suspense>
  );
}
