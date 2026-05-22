import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import OlympiaFullPage from '@/components/olympia/OlympiaFullPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Olympia AI Coach — Altitud Hub',
  description: 'Tu mentora de negocios con inteligencia artificial. Revisa tus métricas, obtén ideas de prospección y coaching personalizado.',
};

export default async function OlympiaPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  return <OlympiaFullPage />;
}
