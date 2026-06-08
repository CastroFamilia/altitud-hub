import { createBrowserClient } from '@supabase/ssr';

// Singleton — only ONE browser client per page load.
// Multiple instances compete for the same auth lock and cause
// "Lock was released because another request stole it" errors.
let _client = null;

export function createClient() {
  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    const mockUser = {
      id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
      email: 'agente@remax-altitud.cr',
      user_metadata: { full_name: 'Mock Agent', avatar_url: '' }
    };
    const mockProfile = {
      id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
      email: 'agente@remax-altitud.cr',
      full_name: 'Mock Agent',
      role: 'broker',
      office: 'altitud',
      status: 'active',
      auth_user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc'
    };
    const mockProperties = [
      {
        id: 'property-1',
        name: 'Casa Bella',
        listing_title_es: 'Casa Bella en Escazú',
        listing_title_en: 'Beautiful House Bella in Escazu',
        property_type: 'house',
        property_type_id: 1,
        listing_contract_type: 1,
        standard_status_id: 1,
        size_m2: 350,
        price: 450000,
        list_price: 450000,
        list_price_currency_id: 2,
        status: 'published',
        unparsed_address: 'Escazú, San José, Costa Rica',
        owner_name: 'John Doe',
        agent_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
        drive_photos_folder_id: 'drive-folder-1',
        drive_photos_folder_url: 'https://drive.google.com/drive/folders/1',
        photos_ready: true,
        created_at: '2026-05-01T10:00:00Z',
        property_images: [
          { id: 'img-1', image_url: 'https://placeholder.supabase.co/img1.jpg', thumbnail_url: 'https://placeholder.supabase.co/img1_thumb.jpg', priority: 0 }
        ]
      }
    ];
    const mockContacts = [
      {
        id: 'contact-1',
        user_id: 'b2ebf531-50e5-4a67-85b4-d53b5161cebc',
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan.perez@example.com',
        phone: '+506 8888-8881',
        type: 'buyer',
        status: 'active',
        primary_language: 'es',
        newsletter_opt_in: true,
        created_at: '2026-01-01T10:00:00Z'
      }
    ];

    return {
      auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        getSession: async () => ({ data: { session: { user: mockUser } }, error: null }),
        onAuthStateChange: (cb) => {
          cb('SIGNED_IN', { user: mockUser });
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: async () => {},
        signInWithOAuth: async () => ({ error: null }),
      },
      from: (table) => {
        const chain = {
          select: () => chain,
          insert: () => chain,
          update: () => chain,
          upsert: () => chain,
          delete: () => chain,
          eq: () => chain,
          neq: () => chain,
          gt: () => chain,
          gte: () => chain,
          lt: () => chain,
          lte: () => chain,
          in: () => chain,
          is: () => chain,
          order: () => chain,
          limit: () => chain,
          single: async () => {
            if (table === 'profiles') {
              return { data: mockProfile, error: null };
            }
            if (table === 'properties') {
              return { data: mockProperties[0], error: null };
            }
            if (table === 'contacts') {
              return { data: mockContacts[0], error: null };
            }
            return { data: null, error: null };
          },
          maybeSingle: async () => {
            if (table === 'profiles') {
              return { data: mockProfile, error: null };
            }
            return { data: null, error: null };
          },
        };
        chain.then = (resolve) => {
          let data = [];
          if (table === 'properties') {
            data = mockProperties;
          } else if (table === 'contacts') {
            data = mockContacts;
          } else if (table === 'profiles') {
            data = [mockProfile];
          }
          return Promise.resolve(resolve({ data, error: null }));
        };
        return chain;
      }
    };
  }

  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
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
