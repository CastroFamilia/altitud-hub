import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { fetchOfficeProperties } from '@/lib/reconnect-api';
import { getSearchById, getPropertiesForMatch, getAcmsForMatch, getPipelineForSearch, getVotesForPipelines } from '@/lib/dal/searches';
import { RECONNECT_TYPE_MAP } from '@/lib/constants/property-constants';

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
    let searchData;
    try {
      searchData = await getSearchById(searchId, supabase);
    } catch (searchError) {
      throw searchError;
    }

    if (!searchData) return NextResponse.json({ matches: [] });

    const tolerance = searchData.price_tolerance ? Number(searchData.price_tolerance) / 100 : 0; // percentage

    const priceMin = searchData.price_min ? searchData.price_min * (1 - tolerance) : 0;
    const priceMax = searchData.price_max ? searchData.price_max * (1 + tolerance) : 999999999;

    // Build Properties query with hard physical filters
    let properties = [];
    try {
      properties = await getPropertiesForMatch(searchData, user.id, supabase);
    } catch (propertiesError) {
      throw propertiesError;
    }

    // Fetch ACMs that match basic types (ACMs lack physical attributes mostly, but we can return them)
    let acms = [];
    try {
      acms = await getAcmsForMatch(searchData, user.id, supabase);
    } catch (acmError) {
      throw acmError;
    }

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

    // ── RECONNECT Live Listings ──────────────────────────────────────
    try {
      const [altitudRes, ceroRes] = await Promise.all([
        fetchOfficeProperties('altitud'),
        fetchOfficeProperties('cero'),
      ]);

      const reconnectListings = [
        ...(altitudRes.properties || []),
        ...(ceroRes.properties || []),
      ];

      const rPriceMin = rPriceMin || (searchData.price_min ? searchData.price_min * (1 - tolerance) : 0);
      const rPriceMax = rPriceMax || (searchData.price_max ? searchData.price_max * (1 + tolerance) : 999_999_999);

      for (const rp of reconnectListings) {
        const hubType = RECONNECT_TYPE_MAP[rp.PropertyTypeId || rp.propertyTypeId];
        if (!hubType || hubType !== searchData.property_type) continue;

        const listingPrice = Number(rp.ListPrice || rp.listPrice || rp.Price || 0);
        if (listingPrice > 0 && (listingPrice < rPriceMin || listingPrice > rPriceMax)) continue;

        const titleEs = rp.ListingTitleES || rp.TitleES || rp.ListingTitle || rp.listingTitle || '';
        const titleEn = rp.ListingTitleEN || rp.TitleEN || '';
        const address = rp.UnparsedAddress || rp.unparsedAddress || rp.Address || '';
        const listingId = String(rp.ListingId || rp.listingId || rp.Id || rp.id || '');

        // Zone fuzzy match
        if (zones.length > 0) {
          const haystack = `${titleEs} ${titleEn} ${address}`.toLowerCase();
          const zoneMatch = zones.some(z => {
            const parts = z.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
            return parts.some(part => haystack.includes(part));
          });
          if (!zoneMatch) continue;
        }

        // Scoring — RECONNECT listings get a solid base since they are live/active
        let rScore = 60;
        const haystack = `${titleEs} ${titleEn} ${address}`.toLowerCase();
        if (mustHaves.length > 0) {
          mustHaves.forEach(mh => { if (haystack.includes(mh.toLowerCase())) rScore += (25 / mustHaves.length); });
        } else { rScore += 25; }
        if (niceToHaves.length > 0) {
          niceToHaves.forEach(nh => { if (haystack.includes(nh.toLowerCase())) rScore += (15 / niceToHaves.length); });
        } else { rScore += 15; }

        const imageUrl = rp.Photos?.[0]?.Url || rp.Photos?.[0]?.url || null;

        matches.push({
          id: `reconnect-${listingId}`,
          match_id: listingId,
          match_type: 'reconnect',
          title: titleEs || titleEn,
          name: titleEs || titleEn || 'Captación RECONNECT',
          type: 'reconnect',
          price: listingPrice,
          location: address,
          main_image_url: imageUrl,
          reconnect_listing_id: listingId,
          reconnect_listing_key: rp.ListingKey || rp.listingKey || null,
          office_key: (altitudRes.properties || []).some(p => String(p.ListingId || p.listingId || p.Id || p.id) === listingId) ? 'altitud' : 'cero',
          agent: { full_name: rp.AgentName || rp.agentName || rp.MemberName || null },
          data: rp,
          match_score: Math.round(rScore),
        });
      }
    } catch (reconnectErr) {
      // RECONNECT is optional — never block matches on API failure
      console.warn('[matches] RECONNECT fetch skipped:', reconnectErr.message);
    }

    // Sort by Match Score descending
    matches.sort((a, b) => b.match_score - a.match_score);

    // Fetch Pipeline for this search
    let pipeline = [];
    try {
      pipeline = await getPipelineForSearch(searchId, supabase);
    } catch (pipelineError) {
      throw pipelineError;
    }

    // Fetch all votes for this pipeline to enrich the agent statistics tab
    let enrichedPipeline = [];
    if (pipeline && pipeline.length > 0) {
      const pipelineIds = pipeline.map(p => p.id);
      let votes = [];
      try {
        votes = await getVotesForPipelines(pipelineIds, supabase);
      } catch (votesError) {
        console.error('Error fetching votes for pipeline:', votesError);
      }
      
      enrichedPipeline = pipeline.map(pItem => {
        const itemVotes = votes.filter(v => v.pipeline_id === pItem.id);
        return {
          ...pItem,
          votes: itemVotes
        };
      });
    }

    return NextResponse.json({ matches, pipeline: enrichedPipeline });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
