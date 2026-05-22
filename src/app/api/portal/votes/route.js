import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { insertVote, getPipelineItem, getSearchById } from '@/lib/dal/searches';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { pipeline_id, voter_name, rating, decision, notes } = body;

    if (!pipeline_id || !voter_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Insert the vote
    let vote;
    try {
      vote = await insertVote({
        pipeline_id,
        voter_name,
        rating: rating || null,
        decision: decision || null,
        notes: notes || null
      }, supabase);
    } catch (voteError) {
      console.error(voteError);
      return NextResponse.json({ error: 'Error al registrar el voto' }, { status: 500 });
    }

    // Optionally: Update the pipeline status if the decision is 'rechazar' or 'interesado'
    // But this can be done manually by the agent. If we want it automatic:
    // if (decision === 'descartar') {
    //   await supabase.from('buyer_search_pipeline').update({ status: 'rechazada' }).eq('id', pipeline_id);
    // } else if (decision === 'visita' || decision === 'negociar' || rating >= 4) {
    //   await supabase.from('buyer_search_pipeline').update({ status: 'interesado' }).eq('id', pipeline_id);
    // }

    // Fetch pipeline and search to get the agent_id for notification
    const pipelineItem = await getPipelineItem(pipeline_id, supabase);

    if (pipelineItem) {
      const search = await getSearchById(pipelineItem.search_id, supabase);

      if (search) {
        // Create Notification
        let title = '¡Nuevo voto en tu portal!';
        let msg = `${voter_name} votó en la búsqueda de ${search.client_name}.`;
        if (rating) msg += ` Dio ${rating} estrellas.`;
        if (decision) msg += ` Quiere: ${decision}.`;

        await supabase.from('notifications').insert({
          user_id: search.agent_id,
          title: title,
          message: msg,
          link: '/busqueda'
        });
      }
    }

    return NextResponse.json({ success: true, vote });
  } catch (error) {
    console.error('Error posting vote:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
