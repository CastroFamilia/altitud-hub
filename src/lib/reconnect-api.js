import { resolveTypeId, canonicalTypeName } from '@/lib/constants/property-constants';

/* ═══════════════════════════════════════════════════════════════
   RECONNECT API Client — REI API CCA v1.0
   
   READ functions: Active now (office property feeds)
   WRITE functions: Scaffolded — activate when credentials arrive
   
   Environment variables required for WRITE operations:
     RECONNECT_API_KEY
     RECONNECT_SECRET_KEY
     RECONNECT_INTEGRATOR_ID
   ═══════════════════════════════════════════════════════════════ */

// Production: /apiCCA — Test: /api (confirmed by Roberto Ceron, RE/MAX CCA)
const RECONNECT_BASE_URL = process.env.RECONNECT_USE_TEST_ENV === 'true'
  ? 'https://remax-cca.com/api'
  : 'https://remax-cca.com/apiCCA';
const RECONNECT_FEED_BASE = 'https://api.remax-cca.com/api';

// Office GUIDs for property feeds
const OFFICE_GUIDS = {
  altitud: 'FEA8746D-CC1D-41B8-89F3-D04AC98274AF',
  cero: '4AD5AE8F-5B47-4A1A-A953-40445F2B4940',
};

// ── TOKEN MANAGEMENT (for write operations) ──────────────────

// Per-office credentials (each office has its own API key, secret, and integrator ID)
const OFFICE_CREDENTIALS = {
  altitud: {
    apiKey: process.env.RECONNECT_ALTITUD_API_KEY,
    secretKey: process.env.RECONNECT_ALTITUD_SECRET_KEY,
    integratorId: process.env.RECONNECT_ALTITUD_INTEGRATOR_ID,
  },
  cero: {
    apiKey: process.env.RECONNECT_CERO_API_KEY,
    secretKey: process.env.RECONNECT_CERO_SECRET_KEY,
    integratorId: process.env.RECONNECT_CERO_INTEGRATOR_ID,
  },
};

function isWriteConfigured(officeKey = 'altitud') {
  const creds = OFFICE_CREDENTIALS[officeKey];
  return !!(creds && creds.apiKey && creds.secretKey && creds.integratorId);
}

// Per-office token cache
const tokenCache = {};

async function getOAuthToken(officeKey = 'altitud') {
  const creds = OFFICE_CREDENTIALS[officeKey];
  if (!creds || !creds.apiKey || !creds.secretKey) {
    return { error: `RECONNECT write credentials not configured for office: ${officeKey}. Set RECONNECT_${officeKey.toUpperCase()}_API_KEY, _SECRET_KEY, _INTEGRATOR_ID.` };
  }

  // Return cached token if still valid (with 5 min buffer)
  const cached = tokenCache[officeKey];
  if (cached && cached.expiry && Date.now() < cached.expiry - 5 * 60 * 1000) {
    return { token: cached.token };
  }

  try {
    const res = await fetch(`${RECONNECT_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: creds.apiKey,
        client_secret: creds.secretKey,
      }),
      redirect: 'manual', // Don't follow redirects — detect auth/endpoint issues
    });

    // 302 = endpoint is down or path is wrong (RECONNECT redirects to login page)
    if (res.status === 301 || res.status === 302) {
      const location = res.headers.get('location') || 'unknown';
      return { error: `OAuth endpoint returned ${res.status} redirect to "${location}". The API endpoint may be down or the URL may have changed. Contact Roberto Ceron at RE/MAX CCA.` };
    }

    if (!res.ok) {
      const text = await res.text();
      return { error: `OAuth token request failed for ${officeKey}: ${res.status} — ${text}` };
    }

    const data = await res.json();
    tokenCache[officeKey] = {
      token: data.access_token,
      // Token expires in 48h but we cache conservatively
      expiry: Date.now() + (data.expires_in || 172800) * 1000,
    };
    return { token: data.access_token };
  } catch (err) {
    return { error: `OAuth token request error for ${officeKey}: ${err.message}` };
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
/**
 * Helper: RECONNECT feed returns booleans as "Y"/"N" strings.
 */
function ynToBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toUpperCase() === 'Y';
  return !!val;
}

export function mapReconnectToHub(rp) {
  return {
    // RECONNECT identifiers
    reconnect_listing_id: rp.ListingId || rp.listingId || rp.Id || rp.id || null,
    reconnect_listing_key: rp.ListingKey || rp.listingKey || null,

    // Basic info — feed uses ListingTitle_en / ListingTitle_es (underscore variant)
    name: rp.ListingTitle_es || rp.ListingTitle_en || rp.ListingTitle || rp.listingTitle || '',
    listing_title_en: rp.ListingTitle_en || rp.ListingTitleEN || rp.TitleEN || '',
    listing_title_es: rp.ListingTitle_es || rp.ListingTitleES || rp.TitleES || '',

    // Classification — normalize to canonical Hub names
    property_type_id: resolveTypeId(rp) || rp.PropertyTypeId || rp.propertyTypeId || null,
    property_type: canonicalTypeName(resolveTypeId(rp)) || (rp.PropertyTypeName_es || rp.PropertyTypeName_en || '').trim() || null,
    listing_contract_type: rp.ListingContractType || rp.listingContractType || 1,
    standard_status_id: rp.StandardStatusId || rp.standardStatusId || 1,

    // Registry Numbers (Costa Rica)
    finca_number: rp.FincaNumber || rp.fincaNumber || rp.Finca || rp.finca || null,
    plano_number: rp.PlanoNumber || rp.planoNumber || rp.Plano || rp.plano || null,

    // Location
    unparsed_address: rp.UnparsedAddress || rp.unparsedAddress || rp.Address || '',
    latitude: rp.Latitude || rp.latitude || null,
    longitude: rp.Longitude || rp.longitude || null,
    country_id: rp.CountryId || rp.countryId || 52,
    state_dep_prov_id: rp.StateDepProvId || rp.stateDepProvId || null,
    location_id: rp.LocationId || rp.locationId || null,
    property_general_location_id: rp.PropertyGeneralLocationId || rp.propertyGeneralLocationId || null,
    postal_code: rp.PostalCode || rp.postalCode || null,

    // Details
    bedrooms_total: rp.BedroomsTotal || rp.bedroomsTotal || 0,
    bathrooms_full: rp.BathroomsFull || rp.bathroomsFull || 0,
    bathrooms_half: rp.BathroomsHalf || rp.bathroomsHalf || 0,
    stories: rp.Stories || rp.stories || 1,
    lot_size_area: rp.LotSizeArea || rp.lotSizeArea || null,
    size_sqm: rp.LotSizeArea || rp.lotSizeArea || null, // Backwards compatibility field
    lot_size_units_id: rp.LotSizeUnitsId || rp.lotSizeUnitsId || 1, // Standard to sqm (1)
    construction_size: rp.ConstructionSize || rp.constructionSize || rp.LivingArea || null,
    construction_size_living: rp.LivingArea || rp.livingArea || rp.ConstructionSizeLiving || rp.constructionSizeLiving || null,
    construction_size_units_id: rp.ConstructionSizeUnitsId || rp.constructionSizeUnitsId || 1, // Standard to sqm (1)
    year_built: rp.YearBuilt || rp.yearBuilt || null,

    // Pricing
    list_price: rp.ListPrice || rp.listPrice || rp.Price || null,
    list_price_currency_id: rp.CurrencyId || rp.ListPriceCurrencyId || rp.listPriceCurrencyId || 2,
    list_price_private: ynToBool(rp.ListPricePrivate || rp.PricePrivate || rp.pricePrivate || rp.PriceHidden || rp.priceHidden),

    // Commission
    listing_side_comm: rp.ListingSideComm || rp.listingSideComm || 3,
    selling_side_comm: rp.SellingSideComm || rp.sellingSideComm || 3,

    // Descriptions — feed uses PublicRemarks_en / publicRemarks_es (underscore variant)
    public_remarks_en: rp.PublicRemarks_en || rp.PublicRemarksEN || rp.publicRemarksEN || '',
    public_remarks_es: rp.publicRemarks_es || rp.PublicRemarksES || rp.publicRemarksES || rp.PublicRemarks || '',
    private_remarks_es: rp.PrivateRemarks_es || rp.PrivateRemarksES || rp.privateRemarksES || rp.PrivateRemarks || rp.privateRemarks || '',
    private_remarks_en: rp.PrivateRemarks_en || rp.PrivateRemarksEN || rp.privateRemarksEN || '',

    // Amenities — feed returns Y/N strings, not booleans
    pool_private: ynToBool(rp.PoolPrivate || rp.poolPrivate),
    garage: ynToBool(rp.Garage || rp.garage),
    garage_spaces: rp.GarageSpaces || rp.garageSpaces || 0,
    garage_covered: ynToBool(rp.GarageCovered || rp.garageCovered),
    cooling: ynToBool(rp.Cooling || rp.cooling),
    has_view: ynToBool(rp.Viewyn || rp.HasView || rp.hasView),
    gated_community: ynToBool(rp.GatedCommunity || rp.gatedCommunity),
    furnished: ynToBool(rp.Furnishedyn || rp.Furnished || rp.furnished),
    maid_room: ynToBool(rp.MaidRoom || rp.maidRoom),
    property_new: ynToBool(rp.PropertyNew || rp.propertyNew),
    listing_agreement: ynToBool(rp.Listingagreementyn || rp.ListingAgreement),
    has_association: ynToBool(rp.HasAssociation || rp.hasAssociation || rp.Associationyn),

    // Dates
    listing_contract_date: rp.ListingContractDate || rp.listingContractDate || null,
    expiration_date: rp.ExpirationDate || rp.expirationDate || null,

    // Media
    video_link: rp.Videolink || rp.VideoLink || rp.videoLink || rp.VirtualTourURL || '',

    // Status — imported properties are already live
    status: 'published',
    reconnect_last_sync: new Date().toISOString(),
  };
}

/**
 * Extract image URLs from a RECONNECT property object.
 * The feed returns Images as a pipe-separated string of URLs.
 * Returns array of { image_url, priority }.
 */
export function extractReconnectImages(rp) {
  const raw = rp.Photos || rp.photos || rp.Images || rp.images || [];

  // Handle pipe-separated string (actual RECONNECT feed format)
  if (typeof raw === 'string') {
    return raw.split('|').filter(url => url.trim()).map((url, i) => ({
      image_url: url.trim(),
      thumbnail_url: null,
      priority: i,
    }));
  }

  // Handle array of objects or strings
  if (Array.isArray(raw)) {
    return raw.map((img, i) => ({
      image_url: typeof img === 'string' ? img : (img.Url || img.url || img.PhotoUrl || img.photoUrl || ''),
      thumbnail_url: typeof img === 'string' ? null : (img.ThumbnailUrl || img.thumbnailUrl || null),
      priority: i,
    })).filter(img => img.image_url);
  }

  return [];
}

// ── WRITE FUNCTIONS (CREDENTIALS RECEIVED — ACTIVATE WHEN READY) ─────

/**
 * Map Hub property data to RECONNECT API format for creating/updating.
 * @param {Object} property — Hub property row
 * @param {string} officeKey — 'altitud' or 'cero'
 */
function mapHubToReconnect(property, officeKey = 'altitud') {
  const creds = OFFICE_CREDENTIALS[officeKey];
  return {
    IntegratorId: creds?.integratorId,
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
 * @param {Object} propertyData — Hub property data
 * @param {'altitud'|'cero'} officeKey — Which office credentials to use
 */
export async function createProperty(propertyData, officeKey = 'altitud') {
  const tokenResult = await getOAuthToken(officeKey);
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  try {
    const payload = mapHubToReconnect(propertyData, officeKey);
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
 * @param {string} listingKey — RECONNECT listing key
 * @param {Object} propertyData — Hub property data
 * @param {'altitud'|'cero'} officeKey — Which office credentials to use
 */
export async function updateProperty(listingKey, propertyData, officeKey = 'altitud') {
  const tokenResult = await getOAuthToken(officeKey);
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  try {
    const payload = { ...mapHubToReconnect(propertyData, officeKey), ListingKey: listingKey };
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
 * @param {string} listingKey — RECONNECT listing key
 * @param {'altitud'|'cero'} officeKey — Which office credentials to use
 */
export async function cancelProperty(listingKey, officeKey = 'altitud') {
  const tokenResult = await getOAuthToken(officeKey);
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  const creds = OFFICE_CREDENTIALS[officeKey];
  try {
    const res = await fetch(`${RECONNECT_BASE_URL}/api/Listing/CancelProperty`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        IntegratorId: creds?.integratorId,
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
 * @param {string} listingKey — RECONNECT listing key
 * @param {string} imageUrl — Public URL of the image
 * @param {number} priority — Image display order (0 = first)
 * @param {'altitud'|'cero'} officeKey — Which office credentials to use
 */
export async function createPropertyImage(listingKey, imageUrl, priority = 0, officeKey = 'altitud') {
  const tokenResult = await getOAuthToken(officeKey);
  if (tokenResult.error) return { success: false, error: tokenResult.error };

  const creds = OFFICE_CREDENTIALS[officeKey];
  try {
    const res = await fetch(`${RECONNECT_BASE_URL}/api/Listing/CreatePropertyImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        IntegratorId: creds?.integratorId,
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

export { OFFICE_GUIDS, OFFICE_CREDENTIALS, isWriteConfigured, getOAuthToken, RECONNECT_BASE_URL };

