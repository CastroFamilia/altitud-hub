import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { search_id, match_type, match_id, status } = body;

    // Check if pipeline item exists
    const { data: existing } = await supabase
      .from('buyer_search_pipeline')
      .select('*')
      .eq('search_id', search_id)
      .eq('match_type', match_type)
      .eq('match_id', match_id)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('buyer_search_pipeline')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();
      
      if (error) throw error;
      return NextResponse.json({ pipeline: data });
    } else {
      const { data, error } = await supabase
        .from('buyer_search_pipeline')
        .insert({
          search_id,
          match_type,
          match_id,
          status
        })
        .select().single();
      
      if (error) throw error;
      return NextResponse.json({ pipeline: data });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
