import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { upsertPipelineItem } from '@/lib/dal/searches';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { search_id, match_type, match_id, status } = body;

    let data;
    try {
      data = await upsertPipelineItem({ search_id, match_type, match_id, status }, supabase);
    } catch (pipelineError) {
      throw pipelineError;
    }

    return NextResponse.json({ pipeline: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
