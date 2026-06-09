import sql from '@/lib/db';

// --- Office Finances ---

export async function getOfficeExpenses() {
  const data = await sql`SELECT * FROM office_expenses`;
  return data;
}

export async function updateOfficeExpense(id, updates) {
  const [data] = await sql`
    UPDATE office_expenses
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data;
}

export async function getOfficeExpenseCategories() {
  const data = await sql`
    SELECT * FROM office_expense_categories
    WHERE active = true
    ORDER BY sort_order
  `;
  return data;
}

export async function getPettyCashFunds() {
  const data = await sql`
    SELECT * FROM petty_cash_funds
    WHERE is_active = true
  `;
  return data;
}

export async function getPettyCashTransactions() {
  const data = await sql`
    SELECT * FROM petty_cash_transactions
    ORDER BY created_at DESC
  `;
  return data;
}

export async function insertPettyCashTransaction(txData) {
  const [data] = await sql`
    INSERT INTO petty_cash_transactions ${sql(txData)}
    RETURNING *
  `;
  return data;
}

export async function getOfficeSalaryConfig() {
  const data = await sql`
    SELECT * FROM office_salary_config
    WHERE is_active = true
  `;
  return data;
}

// --- Office Events ---

export async function getOfficeEvents() {
  const data = await sql`
    SELECT * FROM office_events
    ORDER BY event_date DESC
  `;
  return data;
}

export async function insertOfficeEvent(eventData) {
  const [data] = await sql`
    INSERT INTO office_events ${sql(eventData)}
    RETURNING *
  `;
  return data;
}

export async function getEventAttendance() {
  const data = await sql`SELECT * FROM event_attendance`;
  return data;
}

export async function upsertEventAttendance({ eventId, profileId, status, markedBy }) {
  const [existing] = await sql`
    SELECT id FROM event_attendance
    WHERE event_id = ${eventId} AND profile_id = ${profileId}
  `;

  if (existing) {
    const [data] = await sql`
      UPDATE event_attendance
      SET status = ${status}, marked_by = ${markedBy}
      WHERE id = ${existing.id}
      RETURNING *
    `;
    return data;
  } else {
    const [data] = await sql`
      INSERT INTO event_attendance (event_id, profile_id, status, marked_by)
      VALUES (${eventId}, ${profileId}, ${status}, ${markedBy})
      RETURNING *
    `;
    return data;
  }
}

export async function getOfficeReservations() {
  const data = await sql`
    SELECT * FROM office_reservations
    ORDER BY created_at DESC
  `;
  return data;
}

export async function getOfficeBusinessPlans(officeId, yearStr) {
  const data = await sql`
    SELECT * FROM office_business_plans
    WHERE office = ${officeId}
      AND month >= ${yearStr + '-01-01'}
      AND month <= ${yearStr + '-12-31'}
  `;
  return data;
}

export async function getOfficeBusinessPlanByMonth(officeId, monthStr) {
  const [data] = await sql`
    SELECT * FROM office_business_plans
    WHERE office = ${officeId} AND month = ${monthStr}
  `;
  return data || null;
}

export async function upsertOfficeBusinessPlan(planData) {
  const [existingPlan] = await sql`
    SELECT id FROM office_business_plans
    WHERE office = ${planData.office} AND month = ${planData.month}
  `;

  if (existingPlan) {
    const [data] = await sql`
      UPDATE office_business_plans
      SET ${sql(planData.goals)}, updated_at = NOW()
      WHERE id = ${existingPlan.id}
      RETURNING *
    `;
    return data;
  } else {
    const insertData = {
      office: planData.office,
      month: planData.month,
      ...planData.goals
    };
    const [data] = await sql`
      INSERT INTO office_business_plans ${sql(insertData)}
      RETURNING *
    `;
    return data;
  }
}

// --- Office Settings ---

export async function getOfficeSettings(officeId) {
  const [data] = await sql`
    SELECT * FROM office_settings
    WHERE office_id = ${officeId}
  `;
  return data || null;
}

export async function upsertOfficeSettings(settings) {
  const keys = Object.keys(settings).filter(k => k !== 'office_id');
  if (keys.length > 0) {
    const [data] = await sql`
      INSERT INTO office_settings ${sql(settings)}
      ON CONFLICT (office_id) DO UPDATE SET
      ${sql(settings, keys)}
      RETURNING *
    `;
    return data;
  } else {
    const [data] = await sql`
      INSERT INTO office_settings ${sql(settings)}
      ON CONFLICT (office_id) DO NOTHING
      RETURNING *
    `;
    return data;
  }
}

// --- Referrals ---

export async function getAgentReferrals() {
  const data = await sql`
    SELECT 
      ar.*,
      CASE WHEN p1.id IS NOT NULL THEN json_build_object(
        'full_name', p1.full_name,
        'avatar_url', p1.avatar_url,
        'office', p1.office
      ) ELSE NULL END AS referring_profile,
      CASE WHEN p2.id IS NOT NULL THEN json_build_object(
        'full_name', p2.full_name,
        'avatar_url', p2.avatar_url,
        'office', p2.office
      ) ELSE NULL END AS receiving_profile
    FROM agent_referrals ar
    LEFT JOIN profiles p1 ON ar.referring_agent_id = p1.id
    LEFT JOIN profiles p2 ON ar.receiving_agent_id = p2.id
    ORDER BY ar.created_at DESC
  `;
  return data;
}

export async function updateAgentReferral(id, updates) {
  const [data] = await sql`
    UPDATE agent_referrals
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data;
}

// --- Agent Management ---

export async function getAgentAcmReports(agentId) {
  const data = await sql`
    SELECT * FROM acm_reports
    WHERE agent_id = ${agentId}
    ORDER BY created_at DESC
  `;
  return data;
}

export async function getAgentTransactions(profileId) {
  const data = await sql`
    SELECT * FROM account_transactions
    WHERE profile_id = ${profileId}
    ORDER BY date DESC
  `;
  return data;
}

export async function getAgentNotes(agentId) {
  const data = await sql`
    SELECT 
      an.*,
      CASE WHEN p.id IS NOT NULL THEN json_build_object(
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      ) ELSE NULL END AS author
    FROM agent_notes an
    LEFT JOIN profiles p ON an.author_id = p.id
    WHERE an.agent_id = ${agentId}
    ORDER BY an.created_at DESC
  `;
  return data;
}

export async function getAgentProfiles() {
  const data = await sql`
    SELECT id, full_name, avatar_url, role 
    FROM profiles
  `;
  return data;
}

// --- Account Transactions ---

export async function getAccountTransactions() {
  const data = await sql`SELECT * FROM account_transactions`;
  return data;
}

export async function insertAccountTransaction(txData) {
  const [data] = await sql`
    INSERT INTO account_transactions ${sql(txData)}
    RETURNING *
  `;
  return data;
}

export async function insertNotification(notificationData) {
  const [data] = await sql`
    INSERT INTO notifications ${sql(notificationData)}
    RETURNING *
  `;
  return data;
}

// --- Commissions & Tiers ---

export async function getAgentCommissions() {
  const data = await sql`
    SELECT 
      ac.*,
      CASE WHEN prop.id IS NOT NULL THEN json_build_object(
        'name', prop.name,
        'listing_title_es', prop.listing_title_es,
        'unparsed_address', prop.unparsed_address
      ) ELSE NULL END AS properties,
      CASE WHEN p.id IS NOT NULL THEN json_build_object(
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'commission_tier_id', p.commission_tier_id,
        'status', p.status
      ) ELSE NULL END AS profiles
    FROM agent_commissions ac
    LEFT JOIN properties prop ON ac.property_id = prop.id
    LEFT JOIN profiles p ON ac.agent_id = p.id
    ORDER BY ac.closing_date DESC
  `;
  return data;
}

export async function updateAgentCommission(id, updates) {
  const [data] = await sql`
    UPDATE agent_commissions
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data;
}

export async function getCommissionTiers() {
  const data = await sql`
    SELECT * FROM commission_tiers
    WHERE active = true
    ORDER BY sort_order
  `;
  return data;
}

export async function updateProfile(id, updates) {
  const [data] = await sql`
    UPDATE profiles
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data;
}

export async function getOfficeReservationById(id) {
  const [data] = await sql`
    SELECT 
      o.*,
      CASE WHEN p.id IS NOT NULL THEN json_build_object(
        'full_name', p.full_name,
        'email', p.email,
        'phone', p.phone
      ) ELSE NULL END AS profiles,
      (
        SELECT COALESCE(json_agg(row_to_json(ddi.*)), '[]'::json)
        FROM due_diligence_items ddi
        WHERE ddi.reservation_id = o.id
      ) AS due_diligence_items
    FROM office_reservations o
    LEFT JOIN profiles p ON o.profile_id = p.id
    WHERE o.id = ${id}
  `;
  return data || null;
}
