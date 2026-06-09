import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient, createAdminSupabase } from '@/lib/supabase-server';
import { getActiveSearchesForAgent } from '@/lib/dal/searches';
import { fetchOfficeProperties } from '@/lib/reconnect-api';
import { RECONNECT_TYPE_MAP } from '@/lib/constants/property-constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/* ══════════════════════════════════════════════════════════════════
   OLYMPIA MATCH SUGGESTION
   Generates a short, actionable 1-sentence coaching note per match.
   ══════════════════════════════════════════════════════════════════ */
async function generateOlympiaHint(search, listing) {
  try {
    const title = listing.listing_title_es || listing.name || 'Propiedad';
    const address = listing.unparsed_address || '';
    const price = listing.list_price
      ? `$${Number(listing.list_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : '';
    const timeframe = {
      urgente: 'urgente (quiere comprar ya)',
      '3_6_meses': 'en 3 a 6 meses',
      mas_6_meses: 'en más de 6 meses',
      no_sabe: 'sin plazo definido',
    }[search.purchase_timeframe] || search.purchase_timeframe || '';

    const prompt = `Eres Olympia, coach inmobiliaria de REMAX Altitud. 
Genera UNA sola oración en español (máximo 25 palabras), profesional y motivadora, que le diga al agente por qué este inmueble nuevo en RECONNECT es relevante para su búsqueda activa.

Datos del comprador: Cliente "${search.client_name}", busca ${search.property_type} en ${(search.zones || []).join(', ') || 'zona sin especificar'}, presupuesto ${price}, plazo ${timeframe}.
Inmueble RECONNECT: "${title}"${address ? ` en ${address}` : ''}, ${price}.

Responde SOLO con la oración (sin comillas, sin emojis al inicio). Usa máximo 1 emoji al final.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return response.text?.trim() || null;
  } catch {
    return null; // Graceful degradation — never block notifications on AI failure
  }
}

/* ══════════════════════════════════════════════════════════════════
   MATCH ENGINE
   Returns true if a RECONNECT listing satisfies a buyer search.
   ══════════════════════════════════════════════════════════════════ */
function listingMatchesSearch(listing, search) {
  // 1. Type match
  const hubType = RECONNECT_TYPE_MAP[listing.property_type_id];
  if (!hubType || hubType !== search.property_type) return false;

  // 2. Price match with tolerance
  const tolerance = search.price_tolerance ? Number(search.price_tolerance) / 100 : 0;
  const priceMin = search.price_min ? Number(search.price_min) * (1 - tolerance) : 0;
  const priceMax = search.price_max ? Number(search.price_max) * (1 + tolerance) : 999_999_999;
  const listingPrice = Number(listing.list_price || 0);
  if (listingPrice > 0 && (listingPrice < priceMin || listingPrice > priceMax)) return false;

  // 3. Zone match (fuzzy text search in address + title)
  const zones = search.zones || [];
  if (zones.length > 0) {
    const haystack = `${listing.listing_title_es || ''} ${listing.listing_title_en || ''} ${listing.unparsed_address || ''}`.toLowerCase();
    const zoneMatch = zones.some(z => {
      const parts = z.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      return parts.some(part => haystack.includes(part));
    });
    if (!zoneMatch) return false;
  }

  return true;
}

/* ══════════════════════════════════════════════════════════════════
   GET /api/reconnect/check-alerts
   
   Called silently from the RECONNECT Portfolio page on load.
   Checks active buyer searches against live RECONNECT listings and
   fires Hub notifications + Olympia hints for new matches.
   
   Returns: { checked: number, new_alerts: number }
   ══════════════════════════════════════════════════════════════════ */
export async function GET(request) {
  try {
    // ── Auth ──────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Fetch active buyer searches for this agent ─────────────
    let searches = [];
    try {
      searches = await getActiveSearchesForAgent(user.id, supabase);
    } catch (searchError) {
      throw searchError;
    }
    if (!searches || searches.length === 0) {
      return NextResponse.json({ checked: 0, new_alerts: 0 });
    }

    // ── Fetch already-alerted pairs for dedup ─────────────────
    const { data: alertLog } = await supabase
      .from('reconnect_alert_log')
      .select('search_id, reconnect_listing_id')
      .eq('agent_id', user.id);

    const alreadyAlerted = new Set(
      (alertLog || []).map(r => `${r.search_id}::${r.reconnect_listing_id}`)
    );

    // ── Fetch live RECONNECT listings ─────────────────────────
    const [altitudRes, ceroRes] = await Promise.all([
      fetchOfficeProperties('altitud'),
      fetchOfficeProperties('cero'),
    ]);

    const listings = [
      ...(altitudRes.properties || []),
      ...(ceroRes.properties || []),
    ].map(rp => ({
      reconnect_listing_id: String(rp.ListingId || rp.listingId || rp.Id || rp.id || ''),
      reconnect_listing_key: rp.ListingKey || rp.listingKey || null,
      listing_title_es: rp.ListingTitleES || rp.TitleES || rp.ListingTitle || rp.listingTitle || '',
      listing_title_en: rp.ListingTitleEN || rp.TitleEN || '',
      unparsed_address: rp.UnparsedAddress || rp.unparsedAddress || rp.Address || '',
      property_type_id: rp.PropertyTypeId || rp.propertyTypeId || null,
      list_price: rp.ListPrice || rp.listPrice || rp.Price || null,
      main_image_url: (rp.Photos?.[0]?.Url || rp.Photos?.[0]?.url || null),
      name: rp.ListingTitle || rp.listingTitle || '',
    })).filter(l => l.reconnect_listing_id);

    if (listings.length === 0) {
      return NextResponse.json({ checked: searches.length, new_alerts: 0 });
    }

    // ── Admin client for cross-user DB writes ──────────────────
    const adminDb = createAdminSupabase();
    if (!adminDb) {
      console.warn('[check-alerts] Admin client unavailable — skipping notification writes');
      return NextResponse.json({ checked: searches.length, new_alerts: 0 });
    }

    // ── Match engine + notification dispatch ───────────────────
    let newAlertsCount = 0;

    for (const search of searches) {
      for (const listing of listings) {
        const dedupKey = `${search.id}::${listing.reconnect_listing_id}`;
        if (alreadyAlerted.has(dedupKey)) continue;

        if (!listingMatchesSearch(listing, search)) continue;

        // New match found — generate Olympia hint
        const hint = await generateOlympiaHint(search, listing);

        const title = listing.listing_title_es || listing.name || 'Nueva captación RECONNECT';
        const priceStr = listing.list_price
          ? ` · $${Number(listing.list_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          : '';
        const baseMessage = `"${title}"${priceStr} podría ser ideal para ${search.client_name}.`;
        const message = hint ? `${baseMessage}\n\nOlympia: ${hint}` : baseMessage;

        // Insert notification
        await adminDb.from('notifications').insert({
          user_id: user.id,
          title: `🔗 Match RECONNECT para ${search.client_name}`,
          message,
          link: '/busqueda',
          type: 'reconnect_match',
          is_read: false,
        });

        // Log to dedup table
        await adminDb.from('reconnect_alert_log').insert({
          search_id: search.id,
          reconnect_listing_id: listing.reconnect_listing_id,
          agent_id: user.id,
        }).onConflict('search_id, reconnect_listing_id').ignore();

        alreadyAlerted.add(dedupKey);
        newAlertsCount++;
      }
    }

    return NextResponse.json({
      checked: searches.length,
      new_alerts: newAlertsCount,
    });

  } catch (err) {
    console.error('[check-alerts] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
