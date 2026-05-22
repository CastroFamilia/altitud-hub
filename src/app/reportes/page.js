import { Suspense } from 'react';
import ReportGeneratorClient from './ReportGeneratorClient';
import { createClient } from '@/lib/supabase-server';
import { getDevelopmentsList } from '@/lib/dal/developments';

export const metadata = {
  title: 'Generador de Reportes — ALTITUD HUB',
  description: 'Crea y comparte reportes de rendimiento de desarrollos',
};

export default async function ReportesPage() {
  const supabase = await createClient();

  const developments = await getDevelopmentsList(supabase);

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <ReportGeneratorClient developments={developments || []} />
    </Suspense>
  );
}
