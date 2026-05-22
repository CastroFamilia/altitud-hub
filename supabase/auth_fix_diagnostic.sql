-- =============================================
-- DIAGNOSTIC + FIX: Auth Link for Alejandra
-- Run this in Supabase SQL Editor
-- =============================================

-- STEP 1: Check current state of your profile
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  status, 
  auth_user_id,
  last_login
FROM profiles 
WHERE email ILIKE '%acastro%' OR email ILIKE '%cesar%';

-- STEP 2: Check if your Google account created an auth.users row
SELECT 
  id, 
  email, 
  created_at,
  raw_user_meta_data->>'full_name' as google_name
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- =============================================
-- STEP 3: FIX — If your auth.users row exists but 
-- is NOT linked to the profiles row, run this:
-- Replace 'YOUR-AUTH-USER-UUID' with the id from Step 2
-- =============================================

/*
UPDATE profiles 
SET 
  auth_user_id = 'YOUR-AUTH-USER-UUID',  -- from auth.users.id above
  status = 'active',
  last_login = NOW()
WHERE email = 'acastro@remax-altitud.cr';
*/

-- =============================================
-- STEP 4: Alternative FIX — Reset so the trigger 
-- can re-link on next sign-in.
-- Run this ONLY if auth_user_id is already set
-- but you can't log in:
-- =============================================

/*
UPDATE profiles 
SET auth_user_id = NULL
WHERE email = 'acastro@remax-altitud.cr';

-- Then sign in again with Google and the trigger will re-link.
*/
