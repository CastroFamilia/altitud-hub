import sql from '@/lib/db';

export async function insertAcmReport(reportData) {
  const [data] = await sql`
    INSERT INTO acm_reports ${sql(reportData)}
    RETURNING *
  `;
  return data;
}

export async function updateAcmReport(id, updates) {
  const [data] = await sql`
    UPDATE acm_reports
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING *
  `;
  return data;
}

export async function getSavedPresentation(id) {
  const [data] = await sql`
    SELECT * FROM saved_presentations
    WHERE id = ${id}
  `;
  return data || null;
}

export async function insertSavedPresentation(presentationData) {
  const [data] = await sql`
    INSERT INTO saved_presentations ${sql(presentationData)}
    RETURNING *
  `;
  return data;
}

export async function getPrintablePages() {
  const data = await sql`
    SELECT * FROM printable_pages
    WHERE is_active = true
    ORDER BY order_index ASC
  `;
  return data;
}

export async function uploadPrintableCover(file, filePath) {
  // TODO: Supabase Storage was removed. Implement alternative (e.g., S3, Google Drive, or local storage).
  throw new Error("Storage migration pending: Replace Supabase storage with alternative.");
}
