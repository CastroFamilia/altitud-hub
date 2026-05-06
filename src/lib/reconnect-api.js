/* ═══════════════════════════════════════════════════════════════
   RECONNECT API Client — REI API CCA v1.0
   
   READ functions: Active now (office property feeds)
   WRITE functions: Scaffolded — activate when credentials arrive
   
   Environment variables required for WRITE operations:
     RECONNECT_API_KEY
     RECONNECT_SECRET_KEY
     RECONNECT_INTEGRATOR_ID
   ═══════════════════════════════════════════════════════════════ */

const RECONNECT_BASE_URL = 'https://remax-cca.com/reiapi';
const RECONNECT_FEED_BASE = 'https://api.remax-cca.com/api';

// Office GUIDs for property feeds
const OFFICE_GUIDS = {
  altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
  cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

// ── TOKEN MANAGEMENT (for write operations) ──────────────────

let cachedToken = null;
let tokenExpiry = null;

function isWriteConfigured() {
  return !!(
    process.env.RECONNECT_API_KEY &&
    process.env.RECONNECT_SECRET_KEY &&
    process.env.RECONNECT_INTEGRATOR_ID
  );
}

async function getOAuthToken() {
  if (!isWriteConfigured()) {
    return { error: 'RECONNECT write credentials not configured. Set RECONNECT_API_KEY, RECONNECT_SECRET_KEY, and RECONNECT_INTEGRATOR_ID.' };
  }

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return { token: cachedToken };
  }

  try {
    const res = await fetch(`${RECONNECT_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.RECONNECT_API_KEY,
        client_secret: process.env.RECONNECT_SECRET_KEY,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `OAuth token request failed: ${res.status} — ${text}` };
    }

    const data = await res.json();
    cachedToken = data.access_token;
    // Token expires in 48h but we cache conservatively
    tokenExpiry = Date.now() + (data.expires_in || 172800) * 1000;
    return { token: cachedToken };
  } catch (err) {
    return { error: `OAuth token request error: ${err.message}` };
  }
}

// ── READ FUNCTIONS (ACTIVE NOW) ──────────────────────────────

/**
 * Fetch all properties for an office from the RECONNECT public feed.
 * @param {'altitud'|'cero'} officeKey — Office identifier
 * @returns {Promise<{ properties: Array, error?: string }>}
 */
export async function fetchOfficeProperties(officeKey) {
  const guid = OFFICE_GUIDS[officeKey];
  if (!guid) {
    return { properties: [], error: `Unknown office key: ${officeKey}` };
  }

  try {
    const res = await fetch(`${RECONNECT_FEED_BASE}/PropertiesPerOffice/${guid}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      return { properties: [], error: `Feed request failed: ${res.status}` };
    }

    const data = await res.json();
    return { properties: Array.isArray(data) ? data : (data.properties || data.Properties || []) };
  } catch (err) {
    return { properties: [], error: `Feed fetch error: ${err.message}` };
  }
}

/**
 * Map a RECONNECT property object to Hub schema fields.
 * Field names may vary — this handles common patterns from the CCA API.
 */
export function mapReconnectToHub(rp) {
  return {
    // RECONNECT identifiers
    reconnect_listing_id: rp.ListingId || rp.listingId || rp.Id || rp.id || null,
    reconnect_listing_key: rp.ListingKey || rp.listingKey || null,

    // Basic info
    name: rp.ListingTitle || rp.Title || rp.listingTitle || '',
    listing_title_en: rp.ListingTitleEN || rp.TitleEN || rp.listingTitleEN || '',
    listing_title_es: rp.ListingTitleES || rp.TitleES || rp.ListingTitle || rp.listingTitle || '',

    // Classification
    property_type_id: rp.PropertyTypeId || rp.propertyTypeId || null,
    listing_contract_type: rp.ListingContractType || rp.listingContractType || 1,
    standard_status_id: rp.StandardStatusId || rp.standardStatusId || 1,

    // Location
    unparsed_address: rp.UnparsedAddress || rp.unparsedAddress || rp.Address || '',
    latitude: rp.Latitude || rp.latitude || null,
    longitude: rp.Longitude || rp.longitude || null,
    country_id: rp.CountryId || rp.countryId || 52,
    state_dep_prov_id: rp.StateDepProvId || rp.stateDepProvId || null,
    location_id: rp.LocationId || rp.locationId || null,

    // Details
    bedrooms_total: rp.BedroomsTotal || rp.bedroomsTotal || 0,
    bathrooms_full: rp.BathroomsFull || rp.bathroomsFull || 0,
    bathrooms_half: rp.BathroomsHalf || rp.bathroomsHalf || 0,
    stories: rp.Stories || rp.stories || 1,
    lot_size_area: rp.LotSizeArea || rp.lotSizeArea || null,
    construction_size: rp.ConstructionSize || rp.constructionSize || rp.LivingArea || null,
    year_built: rp.YearBuilt || rp.yearBuilt || null,

    // Pricing
    list_price: rp.ListPrice || rp.listPrice || rp.Price || null,
    list_price_currency_id: rp.ListPriceCurrencyId || rp.listPriceCurrencyId || 2,

    // Commission
    listing_side_comm: rp.ListingSideComm || rp.listingSideComm || 3,
    selling_side_comm: rp.SellingSideComm || rp.sellingSideComm || 3,

    // Descriptions
    public_remarks_en: rp.PublicRemarksEN || rp.publicRemarksEN || '',
    public_remarks_es: rp.PublicRemarksES || rp.publicRemarksES || rp.PublicRemarks || '',

    // Amenities
    pool_private: !!(rp.PoolPrivate || rp.poolPrivate),
    garage: !!(rp.Garage || rp.garage),
    garage_spaces: rp.GarageSpaces || rp.garageSpaces || 0,
    cooling: !!(rp.Cooling || rp.cooling),
    has_view: !!(rp.HasView || rp.hasView),
    gated_community: !!(rp.GatedCommunity || rp.gatedCommunity),
    furnished: !!(rp.Furnished || rp.furnished),
    maid_room: !!(rp.MaidRoom || rp.maidRoom),
    property_new: !!(rp.PropertyNew || rp.propertyNew),

    // Media
    video_link: rp.VideoLink || rp.videoLink || rp.VirtualTourURL || '',

    // Status — imported properties are already live
    status: 'published',
    reconnect_last_sync: new Date().toISOString(),
  };
}

/**
 * Extract image URLs from a RECONNECT property object.
 * Returns array of { image_url, priority }.
 */
export function extractReconnectImages(rp) {
  const images = rp.Photos || rp.photos || rp.Images || rp.images || [];
  return images.map((img, i) => ({
    image_url: img.Url || img.url || img.PhotoUrl || img.photoUrl || img,
    thumbnail_url: img.ThumbnailUrl || img.thumbnailUrl || null,
    priority: i,
  })).filter(img => img.image_url);
}

// ── WRITE FUNCTIONS (SCAFFOLDED) ─────────────────────────────

/**
 * Map Hub property data to RECONNECT API format for creating/updating.
 */
function mapHubToReconnect(property) {
  return {
    IntegratorId: process.env.RECONNECT_INTEGRATOR_ID,
    ListingContractType: property.listing_contract_type || 1,
    StandardStatusId: property.standard_status_id || 1,
    PropertyTypeId: property.property_type_id,
    ListingProbableUseId: property.listing_probable_use_id || 1,
    CountryId: property.country_id || 52,
    StateDepProvId: property.state_dep_prov_id,
    LocationId: property.location_id,
    Latitude: property.latitude,
    Longitude: property.longitude,
    UnparsedAddress: property.unparsed_address,
    ListPrice: property.list_price,
    ListPriceCurrencyId: property.list_price_currency_id || 2,
    ListingSideComm: property.listing_side_comm || 3,
    SellingSideComm: property.selling_side_comm || 3,
    BedroomsTotal: property.bedrooms_total || 0,
    BathroomsFull: property.bathrooms_full || 0,
    BathroomsHalf: property.bathrooms_half || 0,
    Stories: property.stories || 1,
    LotSizeArea: property.lot_size_area,
    ConstructionSize: property.construction_size,
    YearBuilt: property.year_built,
    Garage: property.garage || false,
    GarageSpaces: property.garage_spaces || 0,
    PoolPrivate: property.pool_private || false,
    Cooling: property.cooling || false,
    HasView: property.has_view || false,
    GatedCommunity: property.gated_community || false,
    Furnished: property.furnished || false,
    MaidRoom: property.maid_room || false,
    PropertyNew: property.property_new || false,
    PublicRemarksES: property.public_remarks_es || '',
    PublicRemarksEN: property.public_remarks_en || '',
    ListingTitleES: property.listing_title_es || '',
    ListingTitleEN: property.listing_title_en || '',
    VideoLink: property.video_link || '',
    OfficeCode: property.office_code || '',
  };
}

/**
 * Create a new property on RECONNECT.
 * SCAFFOLDED — returns error until credentials are configured.
 */
export async function createProperty(propertyData) {
  const tokenResult = await getOAuthToken();
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  try {
    const payload = mapHubToReconnect(propertyData);
    const res = await fetch(`${RECONNECT_BASE_URL}/api/Listing/CreateProperty`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `CreateProperty failed: ${res.status} — ${text}` };
    }

    const data = await res.json();
    return {
      success: true,
      listingId: data.ListingId || data.listingId,
      listingKey: data.ListingKey || data.listingKey,
    };
  } catch (err) {
    return { success: false, error: `CreateProperty error: ${err.message}` };
  }
}

/**
 * Full update of a property on RECONNECT.
 * SCAFFOLDED — returns error until credentials are configured.
 */
export async function updateProperty(listingKey, propertyData) {
  const tokenResult = await getOAuthToken();
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  try {
    const payload = { ...mapHubToReconnect(propertyData), ListingKey: listingKey };
    const res = await fetch(`${RECONNECT_BASE_URL}/api/Listing/FullUpdateProperty`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `FullUpdateProperty failed: ${res.status} — ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `FullUpdateProperty error: ${err.message}` };
  }
}

/**
 * Cancel/remove a property on RECONNECT.
 * SCAFFOLDED — returns error until credentials are configured.
 */
export async function cancelProperty(listingKey) {
  const tokenResult = await getOAuthToken();
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  try {
    const res = await fetch(`${RECONNECT_BASE_URL}/api/Listing/CancelProperty`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        IntegratorId: process.env.RECONNECT_INTEGRATOR_ID,
        ListingKey: listingKey,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `CancelProperty failed: ${res.status} — ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: `CancelProperty error: ${err.message}` };
  }
}

/**
 * Upload an image to a RECONNECT property listing.
 * SCAFFOLDED — returns error until credentials are configured.
 */
export async function createPropertyImage(listingKey, imageUrl, priority = 0) {
  const tokenResult = await getOAuthToken();
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  try {
    const res = await fetch(`${RECONNECT_BASE_URL}/api/Listing/CreatePropertyImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        IntegratorId: process.env.RECONNECT_INTEGRATOR_ID,
        ListingKey: listingKey,
        PhotoUrl: imageUrl,
        Priority: priority,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `CreatePropertyImage failed: ${res.status} — ${text}` };
    }

    const data = await res.json();
    return { success: true, photoId: data.PhotoId || data.photoId };
  } catch (err) {
    return { success: false, error: `CreatePropertyImage error: ${err.message}` };
  }
}

export { OFFICE_GUIDS, isWriteConfigured };
