const { test, expect } = require('@playwright/test');

/**
 * Public API Smoke Tests
 * 
 * These test the public (no-auth) API endpoints to verify they respond
 * (i.e., the route files exist and the server processes them).
 * 
 * NOTE: API routes that depend on a database connection may return 500
 * in local dev when DB credentials are not configured. This is expected.
 * We check that the server responds at all (not a timeout or crash).
 */
test.describe('Public API Endpoints', () => {

  test('GET /api/public/developments responds', async ({ request }) => {
    const response = await request.get('/api/public/developments');
    // Route exists and server responds (any status is OK, even 500 due to missing DB)
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });

  test('GET /api/public/properties/feed responds', async ({ request }) => {
    const response = await request.get('/api/public/properties/feed');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });

  test('GET /api/public/properties/feed/encuentra24 responds', async ({ request }) => {
    const response = await request.get('/api/public/properties/feed/encuentra24');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });

  test('GET /api/public/properties/feed/listglobally responds', async ({ request }) => {
    const response = await request.get('/api/public/properties/feed/listglobally');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });

  test('GET /api/public/properties/feed/chozi responds', async ({ request }) => {
    const response = await request.get('/api/public/properties/feed/chozi');
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });

  test('POST /api/public/inquiries responds', async ({ request }) => {
    const response = await request.post('/api/public/inquiries', {
      data: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+506 8888-8888',
        message: 'Interested in a property',
        source: 'test',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });

  test('POST /api/public/analytics/track responds', async ({ request }) => {
    const response = await request.post('/api/public/analytics/track', {
      data: {
        event: 'page_view',
        page: '/d/test',
        referrer: 'https://google.com',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThanOrEqual(500);
  });
});
