import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getOfficeBusinessPlanByMonth, upsertOfficeBusinessPlan } from '@/lib/dal/office';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const office = searchParams.get('office') || 'altitud';
    const month = searchParams.get('month'); // Expecting YYYY-MM-01

    if (!month) {
      const { data: allPlans, error } = await supabase
        .from('office_business_plans')
        .select('*')
        .eq('office', office)
        .order('month', { ascending: true });
        
      if (error) throw error;
      return NextResponse.json({ plans: allPlans || [] });
    }

    const data = await getOfficeBusinessPlanByMonth(office, month, supabase);

    return NextResponse.json({ plan: data || null });
  } catch (err) {
    console.error('Unexpected error in GET office-plan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { office, month, id, created_at, updated_at, ...goals } = body;

    if (!office || !month) {
      return NextResponse.json({ error: 'Missing office or month' }, { status: 400 });
    }

    const result = await upsertOfficeBusinessPlan({
      office,
      month,
      goals
    }, supabase);

    return NextResponse.json({ success: true, plan: result });
  } catch (err) {
    console.error('Unexpected error in POST office-plan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
