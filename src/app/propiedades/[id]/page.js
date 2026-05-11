import { createClient } from '@/lib/supabase-server';
import PropertyDetailClient from './PropertyDetailClient';

export default async function PropertyDetailPage({ params }) {
  const { id } = params;
  const supabase = await createClient();

  let initialProperty = null;
  let initialImages = [];
  let initialMilestones = null;

  if (id) {
    try {
      const { data } = await supabase
        .from('properties')
        .select('*, property_images(id, image_url, thumbnail_url, priority, drive_file_id)')
        .eq('id', id)
        .single();
        
      if (data) {
        initialProperty = data;
        initialImages = (data.property_images || []).sort((a, b) => a.priority - b.priority);
      }

      const { data: msData } = await supabase
        .from('listing_milestones')
        .select('*')
        .eq('property_id', id)
        .single();
        
      if (msData) initialMilestones = msData;
    } catch (e) {
      console.error('PropertyDetailPage: Error fetching property:', e);
    }
  }

  return (
    <PropertyDetailClient 
      initialProperty={initialProperty}
      initialImages={initialImages}
      initialMilestones={initialMilestones}
    />
  );
}
