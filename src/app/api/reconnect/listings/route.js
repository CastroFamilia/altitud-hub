import { fetchOfficeProperties, mapReconnectToHub, extractReconnectImages } from '@/lib/reconnect-api';
import { NextResponse } from 'next/server';

/**
 * GET /api/reconnect/listings
 * Fetches all published listings from both RECONNECT offices and returns
 * a normalized array for the Hub's RECONNECT Portfolio view.
 *
 * Query params:
 *   ?office=altitud|cero|all (default: all)
 *   ?agent_id=<reconnect_agent_id>  (optional filter by agent)
 *   ?type=<property_type_id>        (optional)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const officeParam = searchParams.get('office') || 'all';
  const agentIdFilter = searchParams.get('agent_id');
  const typeFilter = searchParams.get('type');

  try {
    const officesToFetch = officeParam === 'all'
      ? ['altitud', 'cero']
      : [officeParam];

    const results = await Promise.all(
      officesToFetch.map(async (officeKey) => {
        const { properties, error } = await fetchOfficeProperties(officeKey);
        if (error) {
          console.warn(`RECONNECT fetch error for ${officeKey}:`, error);
          return [];
        }
        return properties.map(rp => {
          const mapped = mapReconnectToHub(rp);
          const images = extractReconnectImages(rp);
          return {
            ...mapped,
            // Keep the raw RECONNECT fields we need for display
            reconnect_listing_id: rp.ListingId || rp.listingId || rp.Id || rp.id,
            reconnect_listing_key: rp.ListingKey || rp.listingKey,
            // Agent info from RECONNECT
            agent_id_reconnect: rp.AssociateId || rp.AgentId || rp.agentId || rp.MemberId || rp.memberId || null,
            agent_name: [rp.FirstName, rp.LastName].filter(Boolean).join(' ') || rp.AgentName || rp.agentName || rp.MemberName || rp.memberName || null,
            agent_photo: rp.AgentPhoto || rp.agentPhoto || rp.MemberPhoto || null,
            // Raw photo URLs for display
            main_image_url: images[0]?.image_url || null,
            all_images: images,
            // Office
            office_key: officeKey,
            office_label: officeKey === 'altitud' ? 'RE/MAX Altitud' : 'Altitud Cero',
            // Dates
            listing_date: rp.ListingContractDate || rp.listingContractDate || rp.CreatedAt || rp.createdAt || null,
            modification_timestamp: rp.ModificationTimestamp || rp.modificationTimestamp || null,
          };
        });
      })
    );

    let listings = results.flat();

    // Apply optional filters
    if (agentIdFilter) {
      listings = listings.filter(p => String(p.agent_id_reconnect) === agentIdFilter);
    }
    if (typeFilter) {
      listings = listings.filter(p => String(p.property_type_id) === typeFilter);
    }

    // Sort by modification date (newest first)
    listings.sort((a, b) => {
      const dateA = a.modification_timestamp ? new Date(a.modification_timestamp) : new Date(0);
      const dateB = b.modification_timestamp ? new Date(b.modification_timestamp) : new Date(0);
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      total: listings.length,
      listings,
    });
  } catch (err) {
    console.error('RECONNECT listings route error:', err);
    return NextResponse.json(
      { success: false, error: err.message, listings: [] },
      { status: 500 }
    );
  }
}
