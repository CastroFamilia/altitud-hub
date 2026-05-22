import { createClient } from '@/lib/supabase-server';
import CarpetaClient from './CarpetaClient';
import { getSavedPresentation, getPrintablePages } from '@/lib/dal/prelisting';

export const metadata = {
  title: 'Carpeta Pre-Listing | Altitud Hub',
  description: 'Generador de presentación pre-listing',
};

export default async function CarpetaPage({ searchParams }) {
  const supabase = await createClient();
  const id = searchParams?.id;
  let savedPresentation = null;

  if (id) {
    try {
      savedPresentation = await getSavedPresentation(id, supabase);
    } catch (e) {
      console.warn('[CarpetaPage] Failed to load saved presentation:', e?.message || JSON.stringify(e));
    }
  }

  let customPages = [];
  try {
    customPages = await getPrintablePages(supabase);
  } catch (e) {
    console.warn('[CarpetaPage] Failed to load printable pages:', e?.message || JSON.stringify(e));
  }

  let properties = [];
  try {
    const { data: propData } = await supabase
      .from('properties')
      .select('*, property_images(*)')
      .order('created_at', { ascending: false });
    if (propData) properties = propData;
  } catch (e) {
    console.warn('[CarpetaPage] Failed to load properties:', e?.message || JSON.stringify(e));
  }

  return (
    <CarpetaClient 
      customPages={customPages || []} 
      initialPresentation={savedPresentation} 
      properties={properties || []}
    />
  );
}
