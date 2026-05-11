import { createClient } from '@/lib/supabase-server';
import PropiedadesClient from './PropiedadesClient';

export default async function PropiedadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialProperties = [];

  if (user) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_images(image_url, priority)
        `)
        .eq('agent_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // Attach main image URL to each property
        initialProperties = data.map(p => ({
          ...p,
          main_image_url: p.property_images
            ?.sort((a, b) => a.priority - b.priority)?.[0]?.image_url || null,
        }));
      }
    } catch (err) {
      console.error('Error fetching properties on server:', err);
    }
  }

  return <PropiedadesClient initialProperties={initialProperties} />;
}
