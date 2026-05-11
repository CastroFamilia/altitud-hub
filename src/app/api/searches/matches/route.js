import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get('search_id');

    if (!searchId) return NextResponse.json({ error: 'Missing search_id' }, { status: 400 });

    // Get the search criteria
    const { data: searchData, error: searchError } = await supabase
      .from('buyer_searches')
      .select('*')
      .eq('id', searchId)
      .single();

    if (searchError) throw searchError;
    if (!searchData) return NextResponse.json({ matches: [] });

    const tolerance = searchData.price_tolerance ? Number(searchData.price_tolerance) / 100 : 0; // percentage

    const priceMin = searchData.price_min ? searchData.price_min * (1 - tolerance) : 0;
    const priceMax = searchData.price_max ? searchData.price_max * (1 + tolerance) : 999999999;

    // Build Properties query with hard physical filters
    let propsQuery = supabase
      .from('properties')
      .select('*, profiles!properties_agent_id_fkey(full_name, avatar_url, phone, email)')
      .eq('property_type', searchData.property_type)
      .neq('agent_id', user.id)
      .gte('list_price', priceMin)
      .lte('list_price', priceMax)
      .in('status', ['Activa', 'En_captacion']);

    if (searchData.min_bedrooms > 0) propsQuery = propsQuery.gte('bedrooms_total', searchData.min_bedrooms);
    if (searchData.min_bathrooms > 0) propsQuery = propsQuery.gte('bathrooms_full', searchData.min_bathrooms);
    if (searchData.min_sqm > 0) propsQuery = propsQuery.gte('construction_size', searchData.min_sqm);

    const { data: properties, error: propertiesError } = await propsQuery;
    if (propertiesError) throw propertiesError;

    // Fetch ACMs that match basic types (ACMs lack physical attributes mostly, but we can return them)
    const { data: acms, error: acmError } = await supabase
      .from('acm_reports')
      .select('*, profiles!acm_reports_user_id_fkey(full_name, avatar_url, phone, email)')
      .eq('property_type', searchData.property_type)
      .neq('user_id', user.id)
      .gte('suggested_price', priceMin)
      .lte('suggested_price', priceMax);

    if (acmError) throw acmError;

    // --- JAVASCRIPT MATCHING & SCORING ---
    const zones = searchData.zones || [];
    const mustHaves = searchData.must_haves || [];
    const niceToHaves = searchData.nice_to_haves || [];

    const calculateScore = (item) => {
      let score = 50; // base score for type, price, size
      const text = `${item.name || ''} ${item.unparsed_address || ''} ${item.public_remarks_es || ''} ${item.broker_notes || ''}`.toLowerCase();
      
      if (mustHaves.length > 0) {
        let mustScore = 0;
        mustHaves.forEach(mh => {
          if (text.includes(mh.toLowerCase())) mustScore += (30 / mustHaves.length);
        });
        score += mustScore;
      } else {
        score += 30;
      }

      if (niceToHaves.length > 0) {
        let niceScore = 0;
        niceToHaves.forEach(nh => {
          if (text.includes(nh.toLowerCase())) niceScore += (20 / niceToHaves.length);
        });
        score += niceScore;
      } else {
        score += 20;
      }

      return Math.round(score);
    };

    let filteredProps = properties || [];

    // Filter by zones if specified
    if (zones.length > 0) {
      filteredProps = filteredProps.filter(p => {
        const textToSearch = `${p.name || ''} ${p.unparsed_address || ''} ${p.public_remarks_es || ''}`.toLowerCase();
        return zones.some(z => {
          const parts = z.toLowerCase().split(',').map(s => s.trim());
          // Match if any part (Barrio or District) is in the property text
          return parts.some(part => textToSearch.includes(part));
        });
      });
    }

    const matches = [];

    filteredProps.forEach(p => {
      matches.push({
        match_id: p.id,
        match_type: 'property',
        title: p.name,
        name: p.name,
        type: 'property',
        price: p.list_price,
        location: p.drive_folder_url || '',
        agent: p.profiles,
        data: p,
        match_score: calculateScore(p)
      });
    });

    (acms || []).forEach(a => {
      matches.push({
        match_id: a.id,
        match_type: 'acm',
        title: `ACM: ${a.property_category} en ${a.office}`,
        name: `ACM: ${a.property_category}`,
        type: 'acm',
        price: a.suggested_price,
        location: '',
        agent: a.profiles,
        data: a,
        match_score: 50 // baseline for ACMs
      });
    });

    // Sort by Match Score descending
    matches.sort((a, b) => b.match_score - a.match_score);

    // Fetch Pipeline for this search
    const { data: pipeline, error: pipelineError } = await supabase
      .from('buyer_search_pipeline')
      .select('*')
      .eq('search_id', searchId);

    if (pipelineError) throw pipelineError;

    return NextResponse.json({ matches, pipeline: pipeline || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
