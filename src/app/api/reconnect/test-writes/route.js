import { NextResponse } from 'next/server';
import {
  getOAuthToken,
  createProperty,
  updateProperty,
  cancelProperty,
  createPropertyImage,
  isWriteConfigured,
  OFFICE_CREDENTIALS,
  RECONNECT_BASE_URL,
} from '@/lib/reconnect-api';

/* ═══════════════════════════════════════════════════════════════
   RECONNECT WRITE TEST HARNESS
   
   GET  /api/reconnect/test-writes  → config status check
   POST /api/reconnect/test-writes  → full write lifecycle test
   
   Tests against the RECONNECT test environment (remax-cca.com/api).
   Creates a dummy property, updates it, uploads an image,
   then cancels it — leaving no residual data.
   
   ⚠️  INTERNAL USE ONLY — remove or protect before production.
   ═══════════════════════════════════════════════════════════════ */

// Minimal test payload — just enough required fields for RECONNECT
const TEST_PROPERTY = {
  listing_contract_type: 1,    // Venta
  standard_status_id: 1,       // Active
  property_type_id: 1,         // Residencial
  listing_probable_use_id: 1,
  country_id: 52,              // Costa Rica
  state_dep_prov_id: 8,        // San José
  location_id: null,
  latitude: 9.3547,
  longitude: -83.7074,
  unparsed_address: '[TEST] Altitud Hub API Test — Delete Me',
  list_price: 100000,
  list_price_currency_id: 2,   // USD
  listing_side_comm: 3,
  selling_side_comm: 3,
  bedrooms_total: 2,
  bathrooms_full: 1,
  bathrooms_half: 0,
  stories: 1,
  lot_size_area: 500,
  construction_size: 80,
  year_built: 2024,
  garage: false,
  garage_spaces: 0,
  pool_private: false,
  cooling: false,
  has_view: true,
  gated_community: false,
  furnished: false,
  maid_room: false,
  property_new: false,
  public_remarks_es: '[TEST] Propiedad de prueba creada por Altitud Hub para validar integración API. Ignorar.',
  public_remarks_en: '[TEST] Test property created by Altitud Hub to validate API integration. Ignore.',
  listing_title_es: '[TEST] Prueba API Hub',
  listing_title_en: '[TEST] Hub API Test',
  video_link: '',
  office_code: '',
};

// A small public-domain placeholder image for the image upload test
const TEST_IMAGE_URL = 'https://placehold.co/600x400/0D1B2A/eee?text=Altitud+Hub+Test';

/**
 * GET — Return current configuration status
 */
export async function GET() {
  const altitudCreds = OFFICE_CREDENTIALS.altitud;
  const ceroCreds = OFFICE_CREDENTIALS.cero;

  return NextResponse.json({
    configured: {
      altitud: isWriteConfigured('altitud'),
      cero: isWriteConfigured('cero'),
    },
    environment: process.env.RECONNECT_USE_TEST_ENV === 'true' ? 'TEST' : 'PRODUCTION',
    base_url: RECONNECT_BASE_URL,
    credentials_present: {
      altitud: {
        api_key: !!altitudCreds?.apiKey,
        secret_key: !!altitudCreds?.secretKey,
        integrator_id: altitudCreds?.integratorId || null,
      },
      cero: {
        api_key: !!ceroCreds?.apiKey,
        secret_key: !!ceroCreds?.secretKey,
        integrator_id: ceroCreds?.integratorId || null,
      },
    },
  });
}

/**
 * POST — Execute full write lifecycle test
 * Body: { office?: 'altitud' | 'cero', skipCancel?: boolean }
 */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const officeKey = body.office || 'altitud';
  const skipCancel = body.skipCancel || false;

  const steps = [];
  let listingKey = null;
  let listingId = null;

  function addStep(name, result, durationMs) {
    steps.push({
      step: steps.length + 1,
      name,
      success: result.success !== false && !result.error,
      durationMs,
      ...(result.error ? { error: result.error } : {}),
      ...(result.listingId ? { listingId: result.listingId } : {}),
      ...(result.listingKey ? { listingKey: result.listingKey } : {}),
      ...(result.photoId ? { photoId: result.photoId } : {}),
      ...(result.token ? { tokenPreview: result.token.substring(0, 20) + '...' } : {}),
      rawResponse: result,
    });
  }

  try {
    // ── Step 1: OAuth Token ──────────────────────────────────
    const t1 = Date.now();
    const tokenResult = await getOAuthToken(officeKey);
    addStep('OAuth Token', tokenResult, Date.now() - t1);

    if (tokenResult.error) {
      return NextResponse.json({
        success: false,
        message: 'OAuth token acquisition failed — test environment may be down or credentials invalid.',
        steps,
        officeKey,
        environment: process.env.RECONNECT_USE_TEST_ENV === 'true' ? 'TEST' : 'PRODUCTION',
      });
    }

    // ── Step 2: Create Property ──────────────────────────────
    const t2 = Date.now();
    const createResult = await createProperty(TEST_PROPERTY, officeKey);
    addStep('Create Property', createResult, Date.now() - t2);

    if (!createResult.success) {
      return NextResponse.json({
        success: false,
        message: 'CreateProperty failed — check API response for field validation errors.',
        steps,
        officeKey,
      });
    }

    listingKey = createResult.listingKey;
    listingId = createResult.listingId;

    // ── Step 3: Update Property ──────────────────────────────
    const t3 = Date.now();
    const updatedProperty = {
      ...TEST_PROPERTY,
      list_price: 125000,
      listing_title_es: '[TEST] Prueba API Hub — Actualizado',
      listing_title_en: '[TEST] Hub API Test — Updated',
    };
    const updateResult = await updateProperty(listingKey, updatedProperty, officeKey);
    addStep('Update Property', updateResult, Date.now() - t3);

    // ── Step 4: Upload Image ─────────────────────────────────
    const t4 = Date.now();
    const imageResult = await createPropertyImage(listingKey, TEST_IMAGE_URL, 0, officeKey);
    addStep('Upload Image', imageResult, Date.now() - t4);

    // ── Step 5: Cancel Property (cleanup) ────────────────────
    if (!skipCancel) {
      const t5 = Date.now();
      const cancelResult = await cancelProperty(listingKey, officeKey);
      addStep('Cancel Property (cleanup)', cancelResult, Date.now() - t5);
    } else {
      steps.push({
        step: steps.length + 1,
        name: 'Cancel Property (skipped)',
        success: true,
        durationMs: 0,
        note: 'skipCancel=true — test property left active on RECONNECT test env',
      });
    }

    const allPassed = steps.every(s => s.success);

    return NextResponse.json({
      success: allPassed,
      message: allPassed
        ? '✅ All RECONNECT write operations passed! Ready for production activation.'
        : '⚠️ Some steps failed — review individual step results.',
      officeKey,
      environment: process.env.RECONNECT_USE_TEST_ENV === 'true' ? 'TEST' : 'PRODUCTION',
      listingId,
      listingKey,
      totalDurationMs: steps.reduce((sum, s) => sum + (s.durationMs || 0), 0),
      steps,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: `Unexpected error: ${err.message}`,
      steps,
      officeKey,
    }, { status: 500 });
  }
}
