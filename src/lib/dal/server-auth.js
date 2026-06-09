import { auth } from '@/auth';
import sql from '@/lib/db';

export async function getServerAuth() {
  const session = await auth();
  if (!session?.user) return null;

  const users = await sql`
    SELECT id, email, full_name, role, office, status, avatar_url, auth_user_id, team_id
    FROM profiles
    WHERE auth_user_id = ${session.user.id}
    LIMIT 1
  `;
  const profile = users[0];

  if (!profile) return null;

  return {
    ...session.user,
    profile,
    isBroker: profile.role === 'broker',
    isTeamLeader: profile.role === 'team_leader',
    isAgent: profile.role === 'agent' || profile.role === 'junior',
    isJunior: profile.role === 'junior',
    isOfficeAssistant: profile.role === 'office_assistant',
  };
}
