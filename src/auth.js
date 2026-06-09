import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Only allow @remax-altitud.cr accounts
          hd: "remax-altitud.cr"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "agent@remax-altitud.cr" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = await sql`SELECT * FROM users WHERE email = ${credentials.email} LIMIT 1`;
        const user = users[0];

        if (!user || !user.password_hash) return null;

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        if (!profile.email.endsWith("@remax-altitud.cr")) {
          return false; // Deny login if not from the org
        }

        // Link to existing user or create new one in our pure Postgres DB
        let existingUser = await sql`SELECT id FROM users WHERE email = ${profile.email} LIMIT 1`;
        
        if (existingUser.length === 0) {
          existingUser = await sql`
            INSERT INTO users (name, email, image)
            VALUES (${profile.name}, ${profile.email}, ${profile.picture})
            RETURNING id
          `;
          
          // Also link to profile if there's a pre-invited profile (like the Supabase trigger did)
          await sql`
            UPDATE profiles 
            SET auth_user_id = ${existingUser[0].id}, 
                status = 'active',
                last_login = NOW(),
                avatar_url = COALESCE(${profile.picture}, avatar_url)
            WHERE LOWER(email) = LOWER(${profile.email}) AND auth_user_id IS NULL
          `;
        }
        
        // Ensure account is linked (simplified logic, assumes standard OAuth flow)
        await sql`
          INSERT INTO accounts ("userId", type, provider, "providerAccountId", access_token)
          VALUES (${existingUser[0].id}, ${account.type}, ${account.provider}, ${account.providerAccountId}, ${account.access_token})
          ON CONFLICT (provider, "providerAccountId") DO UPDATE 
          SET access_token = EXCLUDED.access_token
        `;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        
        try {
          // Inject the full profile into the session so the client doesn't have to fetch it
          const users = await sql`
            SELECT id, email, full_name, role, office, status, avatar_url, auth_user_id, team_id
            FROM profiles
            WHERE auth_user_id = ${token.id}
            LIMIT 1
          `;
          const profile = users[0];
          
          if (profile) {
            session.profile = profile;
          }
        } catch (error) {
          console.error("Error fetching profile for session", error);
        }
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  }
});
