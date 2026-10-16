-- ==============================================================================
-- Fix: Allow New User Registration Trigger to Insert Profiles & Terms without RLS Failure
-- ==============================================================================

-- 1. Ensure profiles INSERT policy allows trigger execution (when auth.uid() is null during signup)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id 
    OR auth.uid() IS NULL 
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- 2. Ensure employment_terms INSERT policy allows trigger execution
DROP POLICY IF EXISTS "terms_insert_own" ON public.employment_terms;
CREATE POLICY "terms_insert_own" ON public.employment_terms
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() IS NULL
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- 3. Automatic Trigger to create default profile and default employment term for any newly registered user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert default profile
  INSERT INTO public.profiles (id, annual_vacation_quota)
  VALUES (NEW.id, 22.0)
  ON CONFLICT (id) DO NOTHING;

  -- Insert default initial employment term
  INSERT INTO public.employment_terms (
    user_id,
    name,
    employment_type,
    start_date,
    end_date,
    job_scope_pct,
    daily_standard_sun_wed,
    daily_standard_thu,
    overtime_eligible,
    notes
  )
  VALUES (
    NEW.id,
    'חודשי עם שעות נוספות (ברירת מחדל)',
    'monthly_overtime',
    '2019-01-01'::DATE,
    NULL,
    100.0,
    9.0,
    8.5,
    true,
    'נוצר אוטומטית בעת רישום ראשוני'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
