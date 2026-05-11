import { createClient } from '@/lib/supabase-server';
import FotosClient from './FotosClient';

export default async function FotosPage() {
  const supabase = await createClient();
  let initialProperties = [];

  try {
    const { data } = await supabase
      .from('properties')
      .select(`
        id, name, listing_title_es, listing_title_en,
        unparsed_address, owner_name, agent_id,
        drive_photos_folder_id, drive_photos_folder_url,
        photos_ready, status, created_at,
        property_images(id)
      `)
      .not('drive_photos_folder_id', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      initialProperties = data.map(p => ({
        ...p,
        photo_count: p.property_images?.length || 0,
      }));
    }
  } catch (err) {
    console.error('FotosPage: Error loading properties:', err);
  }

  return <FotosClient initialProperties={initialProperties} />;
}
