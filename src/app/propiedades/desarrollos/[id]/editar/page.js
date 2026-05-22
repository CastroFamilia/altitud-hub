import { createClient } from '@/lib/supabase-server';
import EditorClient from './EditorClient';
import { getDevelopmentById } from '@/lib/dal/developments';

export default async function EditarDesarrolloPage({ params }) {
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
      console.error('EditarDesarrolloPage: Error loading development:', err);
    }
  }

  return <EditorClient initialDevelopment={initialDevelopment} />;
}
