import { getServerAuth } from './server-auth';

// We can mock createClient from supabase-server
jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'real-user-id', email: 'real@example.com' } }, error: null }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({
            data: { id: 'p1', email: 'real@example.com', role: 'agent', office: 'altitud', status: 'active', auth_user_id: 'real-user-id' },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('getServerAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns mock user and profile when NEXT_PUBLIC_TEST_MODE is true', async () => {
    process.env.NEXT_PUBLIC_TEST_MODE = 'true';
    const result = await getServerAuth();
    expect(result).not.toBeNull();
    expect(result.id).toBe('b2ebf531-50e5-4a67-85b4-d53b5161cebc');
    expect(result.profile.role).toBe('broker');
    expect(result.isBroker).toBe(true);
  });

  it('queries database via supabase client when NEXT_PUBLIC_TEST_MODE is not true', async () => {
    process.env.NEXT_PUBLIC_TEST_MODE = 'false';
    const result = await getServerAuth();
    expect(result).not.toBeNull();
    expect(result.id).toBe('real-user-id');
    expect(result.profile.role).toBe('agent');
    expect(result.isBroker).toBe(false);
    expect(result.isAgent).toBe(true);
  });
});
