-- ==============================================================================
-- Fix: Allow New User Registration Trigger to Insert Profiles without RLS Failure
-- ==============================================================================

-- 1. Ensure profiles INSERT policy allows trigger & user execution
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id 
    OR auth.uid() IS NULL 
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- 2. Automatic Trigger Function to create default profile for newly registered users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, annual_vacation_quota)
  VALUES (NEW.id, NEW.email, 22.0)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
