import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const { name, excludeId } = await req.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ exists: false });
    }

    const supabase = getSupabaseAdmin();
    const cleanName = name.trim().toLowerCase();

    // 1. Check in properties table (name column)
    let queryProps = supabase
      .from('properties')
      .select('id, name')
      .ilike('name', cleanName);
    
    if (excludeId) {
      queryProps = queryProps.neq('id', excludeId);
    }
    
    const { data: propsData, error: propsError } = await queryProps.limit(1);
    if (propsError) throw propsError;

    const existsInProperties = propsData && propsData.length > 0;

    // 2. Check in acm_reports table
    const { data: acmData, error: acmError } = await supabase
      .from('acm_reports')
      .select('id, property_address')
      .ilike('property_address', cleanName)
      .limit(1);

    if (acmError) throw acmError;

    const existsInAcm = acmData && acmData.length > 0;

    return NextResponse.json({ 
      exists: existsInProperties || existsInAcm, 
      existsInProperties, 
      existsInAcm 
    });

  } catch (err) {
    console.error('Check property name error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
