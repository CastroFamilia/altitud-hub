import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with service role for public read access if RLS blocks anon,
// or just standard client if RLS is open. We'll use service_role to be safe and bypass RLS for this specific public portal read.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request, { params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    // 1. Fetch the search and its agent info
    const { data: search, error: searchError } = await supabase
      .from('buyer_searches')
      .select(`
        *,
        profiles!buyer_searches_agent_id_fkey(full_name, avatar_url, phone, email, office)
      `)
      .eq('id', id)
      .single();

    if (searchError || !search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // 2. Fetch the pipeline properties for this search
    const { data: pipeline, error: pipelineError } = await supabase
      .from('buyer_search_pipeline')
      .select('*')
      .eq('search_id', id);

    if (pipelineError) {
      return NextResponse.json({ error: pipelineError.message }, { status: 500 });
    }

    // 3. For each item in the pipeline, fetch its actual details (Property, ACM, or External)
    // and also fetch its votes
    const propertyIds = pipeline.filter(p => p.match_type === 'property').map(p => p.match_id);
    const acmIds = pipeline.filter(p => p.match_type === 'acm').map(p => p.match_id);

    let properties = [];
    if (propertyIds.length > 0) {
      const { data: props } = await supabase.from('properties').select('*').in('id', propertyIds);
      properties = props || [];
    }

    let acms = [];
    if (acmIds.length > 0) {
      const { data: as } = await supabase.from('acm_reports').select('*').in('id', acmIds);
      acms = as || [];
    }

    // Fetch all votes for this pipeline
    const pipelineIds = pipeline.map(p => p.id);
    let votes = [];
    if (pipelineIds.length > 0) {
      const { data: vts } = await supabase.from('buyer_search_votes').select('*').in('pipeline_id', pipelineIds);
      votes = vts || [];
    }

    // Map pipeline data back to a cohesive list of "items" for the portal
    const enrichedPipeline = pipeline.map(pItem => {
      let details = null;
      if (pItem.match_type === 'property') {
        details = properties.find(p => p.id === pItem.match_id);
      } else if (pItem.match_type === 'acm') {
        details = acms.find(a => a.id === pItem.match_id);
        // Normalize ACM fields to match property fields for the UI
        if (details) {
          details.list_price = details.suggested_price;
          details.name = details.property_name || 'ACM Property';
        }
      } else if (pItem.match_type === 'external') {
        details = pItem.external_data;
      }

      // Attach votes
      const itemVotes = votes.filter(v => v.pipeline_id === pItem.id);

      return {
        pipeline_id: pItem.id,
        match_type: pItem.match_type,
        status: pItem.status,
        details: details || {},
        votes: itemVotes
      };
    });

    return NextResponse.json({
      search,
      pipeline: enrichedPipeline
    });

  } catch (error) {
    console.error('Error fetching portal data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
