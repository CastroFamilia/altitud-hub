import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for Server Components / Route Handlers.
 * Reads/writes cookies for session management.
 */
export async function createClient() {
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

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored in Server Components (read-only)
          }
        },
      },
    }
  );
}

/**
 * Admin client with Service Role Key — for server-side only operations
 * like inviteUserByEmail(). NEVER expose on client.
 */
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — admin operations will fail');
    return null;
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
