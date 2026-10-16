-- ==============================================================================
-- Admin User Deletion & Cascade Data Wipe
-- Allows authorized admin (michael.liarzi@gmail.com) to delete any user and all their data
-- ==============================================================================

-- 1. Ensure profiles SELECT policy allows the admin to view all users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'email') = 'michael.liarzi@gmail.com'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );

-- 2. Function to delete a user by Email and wipe all their data
CREATE OR REPLACE FUNCTION public.delete_user_by_email(target_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_caller_email text;
  v_reports_count int := 0;
  v_standards_count int := 0;
BEGIN
  -- Permission check if invoked via API
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
    IF v_caller_email != 'michael.liarzi@gmail.com' AND (auth.jwt() ->> 'role') != 'service_role' THEN
      RETURN json_build_object('success', false, 'error', 'אין הרשאת מנהל למחוק משתמשים');
    END IF;
  END IF;

  -- Find user in auth.users or profiles
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(target_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(target_email)) LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'לא נמצא משתמש עם כתובת האימייל: ' || target_email);
  END IF;

  -- Count affected records
  SELECT COUNT(*) INTO v_reports_count FROM public.reports WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_standards_count FROM public.workday_standards WHERE user_id = v_user_id;

  -- Delete from auth.users (Cascades to profiles, reports, workday_standards)
  DELETE FROM auth.users WHERE id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'המשתמש ' || target_email || ' וכל הנתונים שלו נמחקו לצמיתות (' || v_reports_count || ' דיווחים, ' || v_standards_count || ' רשומות תקן).'
  );
END;
$$;

-- 3. Function to delete a user by UUID and wipe all their data
CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_email text;
  v_caller_email text;
  v_reports_count int := 0;
  v_standards_count int := 0;
BEGIN
  -- Permission check if invoked via API
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
    IF v_caller_email != 'michael.liarzi@gmail.com' AND (auth.jwt() ->> 'role') != 'service_role' THEN
      RETURN json_build_object('success', false, 'error', 'אין הרשאת מנהל למחוק משתמשים');
    END IF;
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = target_user_id;
  IF v_user_email IS NULL THEN
    SELECT email INTO v_user_email FROM public.profiles WHERE id = target_user_id;
  END IF;

  SELECT COUNT(*) INTO v_reports_count FROM public.reports WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO v_standards_count FROM public.workday_standards WHERE user_id = target_user_id;

  DELETE FROM auth.users WHERE id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'המשתמש ' || COALESCE(v_user_email, target_user_id::text) || ' וכל הנתונים שלו נמחקו לצמיתות (' || v_reports_count || ' דיווחים, ' || v_standards_count || ' רשומות תקן).'
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.delete_user_by_email(text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(uuid) TO authenticated, service_role, anon;
