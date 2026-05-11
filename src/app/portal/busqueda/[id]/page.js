import { notFound } from 'next/navigation';
import PortalClient from './PortalClient';
import { createClient } from '@/lib/supabase-server';

// Server-side data fetching for SEO and fast initial load
export default async function BuyerPortalPage({ params }) {
  const { id } = params;

  // We fetch using a server client. Wait, since it's a public route and server components run on the server, 
  // RLS might block anon requests. So we can use the service role key or use the fetch API to hit our own endpoint.
  // Using the absolute URL fetch is safer to hit our public endpoint without dealing with RLS here.
  
  let data = null;
  try {
    // In server components, fetch needs absolute URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/portal/searches/${id}`, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) return notFound();
      throw new Error('Failed to fetch data');
    }
    data = await res.json();
  } catch (error) {
    console.error('Portal fetch error:', error);
    return notFound();
  }

  if (!data || !data.search) return notFound();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <PortalClient search={data.search} initialPipeline={data.pipeline} />
    </main>
  );
}
