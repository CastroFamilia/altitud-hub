-- Drop the existing role check constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new constraint with 'admin' replacing 'office_assistant'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('broker', 'team_leader', 'agent', 'admin', 'junior'));
