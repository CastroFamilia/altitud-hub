import { createClient } from '@/lib/supabase-server';
import NuevaPropiedadClient from './NuevaPropiedadClient';

const INITIAL_FORM = {
  name: '', listing_title_es: '', listing_title_en: '',
  property_type_id: 3, listing_contract_type: 1,
  owner_name: '', owner_phones: '', owner_email: '', listing_agreement: false,
  unparsed_address: '', latitude: '', longitude: '',
  bedrooms_total: 0, bathrooms_full: 0, bathrooms_half: 0, stories: 1,
  lot_size_area: '', construction_size: '', year_built: '',
  list_price: '', list_price_currency_id: 2,
  listing_side_comm: 3, selling_side_comm: 3,
  public_remarks_es: '', public_remarks_en: '',
  private_remarks_es: '', private_remarks_en: '',
  video_link: '', drive_photos_folder_url: '',
  pool_private: false, garage: false, garage_spaces: 0,
  cooling: false, has_view: false, gated_community: false,
  furnished: false, maid_room: false, property_new: false,
  office_code: '',
};

export default async function NuevaPropiedadPage({ searchParams }) {
  const supabase = await createClient();
  const editId = searchParams?.edit;

  let initialAcms = [];
  let initialForm = null;

  try {
    // Fetch recent ACMs
    const { data: acmData } = await supabase
      .from('acm_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (acmData) initialAcms = acmData;

    // Fetch existing property if editing
    if (editId) {
      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', editId)
        .single();
        
      if (propData) {
        const editForm = {};
        Object.keys(INITIAL_FORM).forEach(key => {
          editForm[key] = propData[key] !== null && propData[key] !== undefined ? propData[key] : INITIAL_FORM[key];
        });
        // Carry status so client can lock contact fields on approved properties
        editForm._status = propData.status;
        initialForm = editForm;
      }
    }
  } catch (err) {
    console.error('NuevaPropiedadPage: Error fetching initial data:', err);
  }

  return (
    <NuevaPropiedadClient 
      editId={editId}
      initialAcms={initialAcms}
      initialForm={initialForm}
    />
  );
}
