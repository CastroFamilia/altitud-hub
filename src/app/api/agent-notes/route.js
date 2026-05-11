import { createClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');

    if (!agentId) {
      return Response.json({ error: 'agent_id es requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agent_notes')
      .select('*, author:profiles!author_id(full_name, avatar_url)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ notes: data });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const limited = rateLimit(request, { keyPrefix: 'agent-notes-post' });
  if (limited) return limited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, note_content } = body;

    if (!agent_id || !note_content) {
      return Response.json({ error: 'agent_id y note_content son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('agent_notes')
      .insert({
        agent_id,
        author_id: user.id,
        note_content,
      })
      .select('*, author:profiles!author_id(full_name, avatar_url)')
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, note: data });
  } catch (err) {
    return Response.json({ error: 'Error interno: ' + err.message }, { status: 500 });
  }
}
