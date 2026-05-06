/* ═══════════════════════════════════════════════════════════════
   RATE LIMITER — In-memory per-IP rate limiting for API routes
   
   Usage in any route handler:
     import { rateLimit } from '@/lib/rate-limit';
     
     export async function POST(req) {
       const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 });
       if (limited) return limited; // Returns 429 response
       // ... rest of handler
     }
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server';

// In-memory store — resets on server restart (acceptable for Vercel serverless)
const store = new Map();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.start > windowMs * 2) {
      store.delete(key);
    }
  }
}

/**
 * Rate limit a request by IP address.
 * @param {Request} req — The incoming request
 * @param {Object} options
 * @param {number} options.maxRequests — Max requests per window (default: 15)
 * @param {number} options.windowMs — Window duration in ms (default: 60000 = 1 min)
 * @param {string} options.keyPrefix — Optional prefix to namespace different routes
 * @returns {NextResponse|null} — Returns a 429 response if limited, null if OK
 */
export function rateLimit(req, { maxRequests = 15, windowMs = 60_000, keyPrefix = '' } = {}) {
  cleanup(windowMs);

  // Extract IP from headers (Vercel sets x-forwarded-for)
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const key = `${keyPrefix}:${ip}`;

  const now = Date.now();
  const entry = store.get(key) || { count: 0, start: now };

  // Reset window if expired
  if (now - entry.start > windowMs) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count++;
  }

  store.set(key, entry);

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
    return NextResponse.json(
      { 
        error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
        retryAfter 
      },
      { 
        status: 429,
        headers: { 'Retry-After': String(retryAfter) }
      }
    );
  }

  return null; // Not rate limited
}

/**
 * Stricter rate limiter for AI/Olympia endpoints.
 * Default: 8 requests per minute per IP.
 */
export function rateLimitAI(req) {
  return rateLimit(req, { maxRequests: 8, windowMs: 60_000, keyPrefix: 'ai' });
}
