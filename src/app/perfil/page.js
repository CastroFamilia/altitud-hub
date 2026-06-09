import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import PerfilClient from './PerfilClient';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    redirect('/');
  }

  return <PerfilClient initialProfile={profile} />;
}
