/**
 * Tests for rate-limit.js — In-memory per-IP rate limiting
 * 
 * Note: rate-limit.js imports NextResponse from 'next/server' which needs
 * server-side globals. We mock it to test the pure logic.
 */

// Mock next/server before importing
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init) => ({
      ...body,
      status: init?.status || 200,
      headers: init?.headers || {},
    }),
  },
}));

import { rateLimit, rateLimitAI } from './rate-limit';

// Helper: build a mock request with a given IP
function mockRequest(ip = '127.0.0.1') {
  return {
    headers: new Map([['x-forwarded-for', ip]]),
  };
}

describe('rate-limit.js', () => {

  describe('rateLimit()', () => {
    it('returns null (allowed) for the first request', () => {
      const req = mockRequest('10.0.0.1');
      const result = rateLimit(req, { maxRequests: 5, windowMs: 60_000, keyPrefix: 'test1' });
      expect(result).toBeNull();
    });

    it('returns null for requests within the limit', () => {
      const req = mockRequest('10.0.0.2');
      for (let i = 0; i < 3; i++) {
        const result = rateLimit(req, { maxRequests: 5, windowMs: 60_000, keyPrefix: 'test2' });
        expect(result).toBeNull();
      }
    });

    it('returns a 429 response when limit is exceeded', () => {
      const req = mockRequest('10.0.0.3');
      for (let i = 0; i < 3; i++) {
        rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'test3' });
      }
      const result = rateLimit(req, { maxRequests: 3, windowMs: 60_000, keyPrefix: 'test3' });
      expect(result).not.toBeNull();
      expect(result.status).toBe(429);
    });

    it('uses "unknown" IP when no x-forwarded-for header', () => {
      const req = { headers: new Map() };
      const result = rateLimit(req, { maxRequests: 100, windowMs: 60_000, keyPrefix: 'test4' });
      expect(result).toBeNull();
    });

    it('different keyPrefixes are tracked independently', () => {
      const req = mockRequest('10.0.0.4');
      for (let i = 0; i < 2; i++) {
        rateLimit(req, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'apiA' });
      }
      const blockedA = rateLimit(req, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'apiA' });
      expect(blockedA).not.toBeNull();

      const allowedB = rateLimit(req, { maxRequests: 2, windowMs: 60_000, keyPrefix: 'apiB' });
      expect(allowedB).toBeNull();
    });
  });

  describe('rateLimitAI()', () => {
    it('returns null for the first AI request', () => {
      const req = mockRequest('10.0.0.50');
      const result = rateLimitAI(req);
      expect(result).toBeNull();
    });

    it('blocks after 8 requests (stricter AI limit)', () => {
      const req = mockRequest('10.0.0.51');
      for (let i = 0; i < 8; i++) {
        rateLimitAI(req);
      }
      const result = rateLimitAI(req);
      expect(result).not.toBeNull();
      expect(result.status).toBe(429);
    });
  });
});
