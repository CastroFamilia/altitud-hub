import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

/* ═══════════════════════════════════════════════════════════════
   BULK IMPORT PROPERTIES (CSV/JSON)
   POST /api/properties/bulk-import
   
   Accepts an array of property objects (from CSV parsing on the
   client side) and upserts them into the Hub's properties table.
   Supports both active and sold properties.
   ═══════════════════════════════════════════════════════════════ */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  const limited = rateLimit(req, { maxRequests: 3, keyPrefix: 'bulk-import' });
  if (limited) return limited;

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { properties, agentProfileId, importedBy, importType = 'properties_active' } = body;

    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: 'properties array is required and must not be empty.' },
        { status: 400 }
      );
    }

    if (!agentProfileId) {
      return NextResponse.json(
        { error: 'agentProfileId is required.' },
        { status: 400 }
      );
    }

    // Create import batch record
    const batchId = crypto.randomUUID();
    const importRecord = {
      id: batchId,
      agent_profile_id: agentProfileId,
      imported_by: importedBy || agentProfileId,
      import_type: importType,
      file_name: body.fileName || 'manual-import',
      total_rows: properties.length,
      imported_rows: 0,
      skipped_rows: 0,
      error_rows: 0,
      errors: [],
    };

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < properties.length; i++) {
      const row = properties[i];

      try {
        // Build property object from the import data
        const propData = {
          name: row.name || row.property_name || row.titulo || `Import #${i + 1}`,
          listing_title_es: row.listing_title_es || row.titulo || row.name || '',
          listing_title_en: row.listing_title_en || row.title_en || '',
          unparsed_address: row.address || row.direccion || row.ubicacion || row.location || '',
          list_price: parseFloat(row.list_price || row.precio || row.price || 0),
          list_price_currency_id: parseInt(row.currency || '2', 10), // 2 = USD
          property_type_id: parseInt(row.property_type_id || row.tipo || '3', 10),
          listing_contract_type: row.contract_type || row.tipo_contrato || 'Sale',
          bedrooms_total: parseInt(row.bedrooms || row.habitaciones || '0', 10) || null,
          bathrooms_full: parseInt(row.bathrooms || row.banos || '0', 10) || null,
          lot_size_area: parseFloat(row.lot_size || row.terreno || '0') || null,
          construction_size: parseFloat(row.construction || row.construccion || '0') || null,
          public_remarks_es: row.description_es || row.descripcion || '',
          public_remarks_en: row.description_en || '',
          agent_id: agentProfileId,
          status: importType === 'properties_sold' ? 'sold' : (row.status || 'draft'),
          import_batch_id: batchId,
          office_code: row.office_code || 'R0700130',
        };

        // Sold property fields
        if (importType === 'properties_sold' || row.status === 'sold') {
          propData.status = 'sold';
          propData.sold_price = parseFloat(row.sold_price || row.precio_venta || row.list_price || row.precio || 0);
          propData.sold_date = row.sold_date || row.fecha_cierre || row.close_date || null;
          propData.buyer_name = row.buyer_name || row.comprador || null;
          propData.buyer_agent = row.buyer_agent || row.agente_comprador || null;
          propData.buyer_agent_office = row.buyer_agent_office || null;
          propData.days_on_market = parseInt(row.days_on_market || row.dias_mercado || '0', 10) || null;
        }

        const { data, error } = await supabase
          .from('properties')
          .insert(propData)
          .select('id')
          .single();

        if (error) {
          errors.push({ row: i + 1, field: row.name || `Row ${i + 1}`, error: error.message });
          continue;
        }

        // If sold, also create a commission record if commission data is provided
        if (propData.status === 'sold' && (row.commission_pct || row.comision_pct)) {
          const salePrice = propData.sold_price || propData.list_price || 0;
          const commPct = parseFloat(row.commission_pct || row.comision_pct || 6);
          const gross = salePrice * (commPct / 100);
          const sidePct = parseFloat(row.side_pct || '50');
          const sideAmount = gross * (sidePct / 100);
          const rccaPct = 6;
          const rccaAmount = sideAmount * (rccaPct / 100);
          const agentSplitPct = parseFloat(row.agent_split_pct || row.split_agente || '45');
          const isStarter = agentSplitPct <= 45;

          let agentAmount, officeAmount;
          if (isStarter) {
            agentAmount = sideAmount * (agentSplitPct / 100);
            officeAmount = sideAmount - agentAmount - rccaAmount;
          } else {
            const afterRcca = sideAmount - rccaAmount;
            agentAmount = afterRcca * (agentSplitPct / 100);
            officeAmount = afterRcca - agentAmount;
          }

          await supabase.from('agent_commissions').insert({
            property_id: data.id,
            agent_id: agentProfileId,
            sale_price: salePrice,
            total_commission_pct: commPct,
            gross_commission: gross,
            side: row.side || 'listing',
            side_pct: sidePct,
            side_amount: sideAmount,
            rcca_fee_pct: rccaPct,
            rcca_fee_amount: rccaAmount,
            after_rcca: isStarter ? sideAmount : (sideAmount - rccaAmount),
            agent_split_pct: agentSplitPct,
            agent_amount: agentAmount,
            office_amount: officeAmount,
            closing_date: propData.sold_date,
            status: 'paid', // Historical imports are already paid
          });
        }

        imported++;
      } catch (err) {
        errors.push({ row: i + 1, field: row.name || `Row ${i + 1}`, error: err.message });
      }
    }

    skipped = properties.length - imported - errors.length;

    // Save import record
    importRecord.imported_rows = imported;
    importRecord.skipped_rows = skipped;
    importRecord.error_rows = errors.length;
    importRecord.errors = errors;

    await supabase.from('agent_history_imports').insert(importRecord);

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      total: properties.length,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    return NextResponse.json(
      { error: 'Bulk import failed: ' + err.message },
      { status: 500 }
    );
  }
}
