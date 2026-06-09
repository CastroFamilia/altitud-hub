import { createClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import ContactosClient from './ContactosClient';
import TopNav from '@/components/layout/TopNav';
import { getContacts, getLeadsAsContacts } from '@/lib/dal/contacts';
export default async function ContactosPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialContacts = [];
  if (user) {
    try {
      const { data: realP } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      let targetUserId = user.id;

      let targetProfileId = realP?.id;

      if (realP && (realP.role === 'broker' || realP.role === 'admin')) {
        const cookieStore = await cookies();
        const impId = cookieStore.get('impersonated_id')?.value;
        if (impId) {
          const { data: impP } = await supabase
            .from('profiles')
            .select('id, auth_user_id')
            .eq('id', impId)
            .maybeSingle();
          
          if (impP?.auth_user_id) {
            targetUserId = impP.auth_user_id;
            targetProfileId = impP.id;
          }
        }
      }

      const [hubContacts, webLeads] = await Promise.all([
        getContacts(targetUserId),
        targetProfileId ? getLeadsAsContacts(targetProfileId) : Promise.resolve([])
      ]);

      initialContacts = [...hubContacts, ...webLeads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <TopNav titleKey="nav_crm" subtitleKey="contact_dash_desc" />
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-[#0B1120] w-full">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20">
          <ContactosClient initialContacts={initialContacts} />
        </div>
      </div>
    </>
  );
}
