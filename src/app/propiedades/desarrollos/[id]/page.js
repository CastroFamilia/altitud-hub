import { createClient } from '@/lib/supabase-server';
import DesarrolloDetailClient from './DesarrolloDetailClient';
import { getDevelopmentById } from '@/lib/dal/developments';

export default async function DesarrolloDetailPage({ params }) {
  const { id } = params;
  const supabase = await createClient();

  let initialDevelopment = null;

  if (id) {
    try {
      const data = await getDevelopmentById(id, supabase);
      if (data) {
        initialDevelopment = data;
      }
    } catch (err) {
      console.error('DesarrolloDetailPage: Error loading development:', err);
    }
  }

  return <DesarrolloDetailClient initialDevelopment={initialDevelopment} />;
}
