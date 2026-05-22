import { createClient } from './supabase-browser';

/**
 * Tracks an OKR activity in the database.
 * If the user is logged in, it uses an RPC call to safely increment the daily counter
 * in `agent_daily_okr_entries`. It falls back to localStorage if DB fails or user is offline.
 *
 * @param {string} activityKey - The key of the activity (e.g., 'prelistings', 'acm', 'reservas')
 * @param {number} delta - The amount to increment (default 1)
 */
export async function trackOkrActivity(activityKey, delta = 1) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const today = new Date().toISOString().split('T')[0];

    // Fallback: update local storage so it feels immediate
    updateLocalStorageFallback(today, activityKey, delta);

    if (session?.user?.id) {
      // IMPORTANT: agent_daily_okr_entries.profile_id references profiles.id (NOT auth.uid())
      // We must look up the internal profile row to get the correct UUID.
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (!profile?.id) {
        console.warn('[OKR Tracker] Could not resolve profile ID for auth user:', session.user.id);
        return;
      }

      // Use RPC to atomically increment the activity in the database
      const { error } = await supabase.rpc('increment_okr_activity', {
        p_profile_id: profile.id,
        p_date: today,
        p_activity_key: activityKey,
        p_delta: delta
      });
      
      if (error) {
        // PGRST202 = function not found (migration not applied yet) — silent fallback
        if (error.code === 'PGRST202') {
          console.warn('[OKR Tracker] increment_okr_activity RPC not found — run migration 20260512_agent_daily_okrs.sql in Supabase.');
          return;
        }
        console.error('[OKR Tracker] Failed to increment DB OKR activity:', error.message || error.code || JSON.stringify(error));
      }
    }
  } catch (error) {
    console.error('[OKR Tracker] Error tracking activity:', error?.message || error);
  }
}

/**
 * Updates localStorage as a fallback/immediate update mechanism
 * This ensures that if the DB call fails or hasn't synced back, the UI still feels responsive.
 */
function updateLocalStorageFallback(date, key, delta) {
  try {
    if (typeof window === 'undefined') return;
    const STORAGE_KEY = 'altitud_okr_entries';
    const raw = localStorage.getItem(STORAGE_KEY);
    let entries = [];
    if (raw) {
      entries = JSON.parse(raw);
    }
    
    const existingIndex = entries.findIndex(e => e.date === date);
    if (existingIndex >= 0) {
      entries[existingIndex][key] = Math.max(0, (entries[existingIndex][key] || 0) + delta);
    } else {
      entries.push({ date, [key]: Math.max(0, delta) });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    // Ignore localStorage errors (e.g. quota exceeded, incognito)
  }
}
