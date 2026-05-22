import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/acm
 * Returns a list of ACM reports for the logged-in agent.
 */
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'; // Mock UUID for development

    const { data, error } = await supabase
      .from('acm_reports')
      .select('*')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[acm] DB fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data || [] });
  } catch (err) {
    console.error('[acm] Unexpected GET error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/acm
 * Creates or updates a comprehensive ACM report (Comparables, Rentabilidad, Reposición or Consolidated).
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'; // Mock UUID for development

    const body = await request.json();
    const {
      id, // if present, update existing row
      client_name,
      client_phone,
      client_email,
      property_address,
      property_type,
      property_category = 'residential',
      office = 'altitud',
      status = 'draft',
      suggested_price,
      price_range_low,
      price_range_high,
      agent_notes,
      
      // Rentabilidad fields
      rental_units,
      rental_price,
      expenses_amount,
      expenses_period,
      cap_rate,
      gross_income,
      total_expenses,
      noi,
      rental_value,

      // Flexible JSONB indicators for other methodologies and settings
      indicators = {}
    } = body;

    // Fetch user details to prefill agent metadata if not provided
    let agentName = 'Agente';
    let agentEmail = '';
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, office, remax_agent_id')
      .eq('auth_user_id', activeUserId)
      .single();

    if (profile) {
      agentName = profile.full_name || agentName;
      agentEmail = user ? user.email : '';
    }

    const payload = {
      user_id: activeUserId,
      agent_name: agentName,
      agent_email: agentEmail || null,
      office: office || profile?.office || 'altitud',
      client_name: client_name || null,
      client_phone: client_phone || null,
      client_email: client_email || null,
      property_address: property_address || null,
      property_type: property_type || 'casa',
      property_category: property_category || 'residential',
      status: status || 'draft',
      suggested_price: suggested_price ? Number(suggested_price) : null,
      price_range_low: price_range_low ? Number(price_range_low) : null,
      price_range_high: price_range_high ? Number(price_range_high) : null,
      agent_notes: agent_notes || null,

      // Rentabilidad fields
      analysis_type: 'consolidado', // mark as consolidado
      rental_units: rental_units ? Number(rental_units) : null,
      rental_price: rental_price ? Number(rental_price) : null,
      expenses_amount: expenses_amount ? Number(expenses_amount) : null,
      expenses_period: expenses_period || 'monthly',
      cap_rate: cap_rate ? Number(cap_rate) : null,
      gross_income: gross_income ? Number(gross_income) : null,
      total_expenses: total_expenses ? Number(total_expenses) : null,
      noi: noi ? Number(noi) : null,
      rental_value: rental_value ? Number(rental_value) : null,

      // Stores comparables summaries, replacement value inputs, active methods and weights
      indicators: indicators || {},
      updated_at: new Date().toISOString()
    };

    let result;
    if (id) {
      result = await supabase
        .from('acm_reports')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    } else {
      payload.created_at = new Date().toISOString();
      result = await supabase
        .from('acm_reports')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[acm] DB write error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, report: result.data });
  } catch (err) {
    console.error('[acm] Unexpected POST error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * DELETE /api/acm
 * Deletes a saved ACM report by ID.
 */
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if ((authError || !user) && process.env.NODE_ENV !== 'development') {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user'}` }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const activeUserId = user ? user.id : 'b2ebf531-50e5-4a67-85b4-d53b5161cebc';

    const { error } = await supabase
      .from('acm_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', activeUserId);

    if (error) {
      console.error('[acm] DB delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[acm] Unexpected DELETE error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
