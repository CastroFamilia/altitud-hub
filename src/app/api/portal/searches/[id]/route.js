import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSearchWithAgentById, getPipelineForSearch, getVotesForPipelines } from '@/lib/dal/searches';
import { getPropertiesByIds } from '@/lib/dal/properties';
import { getAcmsByIds } from '@/lib/dal/acm';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request, { params }) {
  const supabase = getSupabase();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    // 1. Fetch the search and its agent info
    let search;
    try {
      search = await getSearchWithAgentById(id, supabase);
    } catch (searchError) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // 2. Fetch the pipeline properties for this search
    let pipeline = [];
    try {
      pipeline = await getPipelineForSearch(id, supabase);
    } catch (pipelineError) {
      return NextResponse.json({ error: pipelineError.message }, { status: 500 });
    }

    // 3. For each item in the pipeline, fetch its actual details (Property, ACM, or External)
    // and also fetch its votes
    const propertyIds = pipeline.filter(p => p.match_type === 'property').map(p => p.match_id);
    const acmIds = pipeline.filter(p => p.match_type === 'acm').map(p => p.match_id);

    let properties = [];
    if (propertyIds.length > 0) {
      properties = await getPropertiesByIds(propertyIds, supabase);
    }

    let acms = [];
    if (acmIds.length > 0) {
      acms = await getAcmsByIds(acmIds, supabase);
    }

    // Fetch all votes for this pipeline
    const pipelineIds = pipeline.map(p => p.id);
    let votes = [];
    if (pipelineIds.length > 0) {
      votes = await getVotesForPipelines(pipelineIds, supabase);
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
