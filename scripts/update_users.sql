
-- ESSENTIAL: Drop the foreign key constraint that links profiles to auth.users.
-- This allows creating "Ghost Users" (managed by Admin) that don't have a Supabase Auth account yet.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add column for admin-set passwords
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legacy_password text;

-- ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE POLICIES FOR HYBRID AUTH (Required for the app to function with "Ghost" users)
-- 1. Allow reading profiles (needed for login check)
DROP POLICY IF EXISTS "Public profiles access" ON profiles;
CREATE POLICY "Public profiles access" ON profiles FOR SELECT USING (true);

-- 2. Allow inserting/updating profiles (needed for Admin features without Service Role)
DROP POLICY IF EXISTS "Public insert update" ON profiles;
CREATE POLICY "Public insert update" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- 3. Ensure Appointments are accessible
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public appointments access" ON appointments;
CREATE POLICY "Public appointments access" ON appointments FOR ALL USING (true) WITH CHECK (true);
