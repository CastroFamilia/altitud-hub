import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/acm/rental-analysis
 * Saves (or upserts) a rental yield analysis on an acm_reports row.
 * All calculations are re-done server-side for integrity.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      acm_id,          // Optional – if provided, update existing row
      property_id,
      agent_name,
      agent_email,
      office,
      // Rental inputs
      rental_units,
      rental_price,       // monthly per unit, USD
      expenses_amount,    // total expenses entered by agent
      expenses_period,    // 'monthly' | 'annual'
      cap_rate,           // % proposed by agent
      // Optional metadata
      property_address,
      property_district,
      client_name,
      agent_notes,
    } = body;

    // ── Validations ──────────────────────────────────────────────
    if (!rental_units || !rental_price || !cap_rate) {
      return NextResponse.json(
        { error: 'rental_units, rental_price y cap_rate son requeridos' },
        { status: 400 }
      );
    }
    if (cap_rate <= 0 || cap_rate > 100) {
      return NextResponse.json(
        { error: 'cap_rate debe ser un porcentaje válido (0–100)' },
        { status: 400 }
      );
    }

    // ── Server-side calculations ──────────────────────────────────
    const units        = Number(rental_units);
    const monthlyRent  = Number(rental_price);
    const grossIncome  = units * monthlyRent * 12;

    const expensesRaw    = Number(expenses_amount || 0);
    const annualExpenses = expenses_period === 'monthly'
      ? expensesRaw * 12
      : expensesRaw;

    const noi          = grossIncome - annualExpenses;
    const capRateDec   = Number(cap_rate) / 100;
    const rentalValue  = capRateDec > 0 ? noi / capRateDec : 0;

    // ── Persist ───────────────────────────────────────────────────
    const supabase = await createClient();

    const payload = {
      analysis_type:    'rentabilidad',
      property_category: 'commercial',
      office:            office || 'altitud',
      agent_name:        agent_name || 'Agente',
      agent_email:       agent_email || null,
      property_address:  property_address || null,
      property_district: property_district || null,
      client_name:       client_name || null,
      agent_notes:       agent_notes || null,
      // Inputs
      rental_units:      units,
      rental_price:      monthlyRent,
      expenses_amount:   expensesRaw,
      expenses_period:   expenses_period || 'monthly',
      cap_rate:          Number(cap_rate),
      // Computed
      gross_income:      grossIncome,
      total_expenses:    annualExpenses,
      noi,
      rental_value:      rentalValue,
      suggested_price:   rentalValue,   // mirror into standard field for reports
      status:            'completed',
      updated_at:        new Date().toISOString(),
    };

    let result;
    if (acm_id) {
      result = await supabase
        .from('acm_reports')
        .update(payload)
        .eq('id', acm_id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('acm_reports')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[rental-analysis] DB error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: result.data,
      computed: { gross_income: grossIncome, annual_expenses: annualExpenses, noi, rental_value: rentalValue },
    });

  } catch (err) {
    console.error('[rental-analysis] Unexpected error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
