import sql from '@/lib/db';

export async function getActiveCommissionTiers() {
  const data = await sql`
    SELECT * 
    FROM commission_tiers 
    WHERE active = true 
    ORDER BY sort_order ASC
  `;
  return data;
}

export async function insertAgentCommission(commissionData) {
  // postgres.js can insert objects directly
  await sql`
    INSERT INTO agent_commissions ${sql(commissionData)}
  `;
}
