import { createBrowserClient } from '@supabase/ssr';

// Singleton — only ONE browser client per page load.
// Multiple instances compete for the same auth lock and cause
// "Lock was released because another request stole it" errors.
let _client = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          // Disable the navigator.locks mechanism.
          // It is designed for multi-tab token-refresh sync but causes
          // fatal race conditions in Next.js dev mode (React Strict Mode
          // double-invokes effects, triggering two _initialize calls that
          // fight over the same lock). ALTITUD HUB is a single-tab app
          // so this trade-off is fully acceptable.
          lock: (_name, _acquireTimeout, fn) => fn(),
        },
      }
    );
  }
  return _client;
}
