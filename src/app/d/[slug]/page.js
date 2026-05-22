import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import DevelopmentLanding from './DevelopmentLanding';
import { getActiveDevelopmentBySlug, getActiveDevelopmentWithProperties } from '@/lib/dal/developments';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC DEVELOPMENT LANDING PAGE — /d/[slug]
   
   Server Component: fetches development by slug, generates
   dynamic SEO metadata, renders premium public landing page.
   No authentication required.
   ═══════════════════════════════════════════════════════════════ */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  let dev = null;
  try {
    dev = await getActiveDevelopmentBySlug(slug, supabase);
  } catch (err) {
    console.error(err);
  }

  if (!dev) {
    return { title: 'Development Not Found' };
  }

  const title = `${dev.name} — ${dev.developer_name || 'RE/MAX Altitud'}`;
  const description = dev.tagline_en || dev.tagline_es || `Discover ${dev.name}, an exclusive real estate development.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: dev.og_image_url ? [{ url: dev.og_image_url, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: dev.og_image_url ? [dev.og_image_url] : [],
    },
  };
}

export default async function DevelopmentPage({ params }) {
  const { slug } = await params;
  const supabase = await createClient();

  let dev = null;
  try {
    dev = await getActiveDevelopmentWithProperties(slug, supabase);
  } catch (err) {
    console.error(err);
    notFound();
  }

  if (!dev) {
    notFound();
  }

  // Fetch agent profile for the agent card block
  const { data: agentProfile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, avatar_url, office')
    .eq('auth_user_id', dev.agent_id)
    .single();

  return (
    <DevelopmentLanding
      development={dev}
      properties={dev.properties || []}
      agent={agentProfile}
    />
  );
}
