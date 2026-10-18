const { Client } = require('pg');

const DB_CONFIG = {
  host: process.env.PGHOST || '10.0.0.16',
  port: parseInt(process.env.PGPORT || '54320', 10),
  user: process.env.PGUSER || 'postgres.your-tenant-id',
  password: process.env.PGPASSWORD || 'a6UAzV7BJSdNjPiLUFZ3NfDoS5kj12',
  database: process.env.PGDATABASE || 'postgres',
};

const SQL_MIGRATION = `
-- 1. System Config Table for retention days
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.system_config (key, value)
VALUES ('backup_retention_days', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

GRANT ALL ON TABLE public.system_config TO postgres, authenticated, service_role, anon;

-- Update generate_system_backup to read retention days from system_config
CREATE OR REPLACE FUNCTION public.generate_system_backup(p_backup_type TEXT DEFAULT 'auto_nas')
RETURNS UUID AS $$
DECLARE
  v_backup_id UUID;
  v_now TIMESTAMPTZ := now();
  v_date_str TEXT := to_char(v_now AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD');
  v_time_str TEXT := to_char(v_now AT TIME ZONE 'Asia/Jerusalem', 'HH24MISS');
  v_filename TEXT;
  v_reports_count INTEGER := 0;
  v_profiles_count INTEGER := 0;
  v_standards_count INTEGER := 0;
  v_terms_count INTEGER := 0;
  v_backup_data JSONB;
  v_backup_sql TEXT;
  v_size_kb NUMERIC(10, 2);
  v_retention_limit INTEGER := 30;
  v_config_val JSONB;
BEGIN
  -- Read retention setting from system_config
  SELECT value INTO v_config_val FROM public.system_config WHERE key = 'backup_retention_days';
  IF v_config_val IS NOT NULL THEN
    v_retention_limit := coalesce(
      (v_config_val->>0)::integer,
      (v_config_val #>> '{}')::integer,
      30
    );
  END IF;
  IF v_retention_limit IS NULL OR v_retention_limit < 1 THEN
    v_retention_limit := 30;
  END IF;

  v_filename := 'backup-nas-' || v_date_str || '-' || v_time_str || '.sql';

  SELECT count(*) INTO v_profiles_count FROM public.profiles;
  SELECT count(*) INTO v_standards_count FROM public.workday_standards;
  SELECT count(*) INTO v_reports_count FROM public.reports;
  SELECT count(*) INTO v_terms_count FROM public.employment_terms;

  v_backup_data := jsonb_build_object(
    'version', '1.0',
    'created_at', v_now,
    'backup_type', p_backup_type,
    'profiles', coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM public.profiles p), '[]'::jsonb),
    'workday_standards', coalesce((SELECT jsonb_agg(to_jsonb(w)) FROM public.workday_standards w), '[]'::jsonb),
    'reports', coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM public.reports r), '[]'::jsonb),
    'employment_terms', coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM public.employment_terms e), '[]'::jsonb)
  );

  v_backup_sql := '-- ============================================================' || E'\n' ||
    '-- Employee Work Hours Dashboard - NAS System Backup' || E'\n' ||
    '-- Created: ' || to_char(v_now, 'YYYY-MM-DD HH24:MI:SS UTC') || E'\n' ||
    '-- Type: ' || p_backup_type || E'\n' ||
    '-- Reports: ' || v_reports_count || ', Profiles: ' || v_profiles_count || E'\n' ||
    '-- ============================================================' || E'\n' ||
    'BEGIN;' || E'\n\n' ||
    'SELECT public.restore_system_backup_data(' || quote_literal(v_backup_data::text) || '::jsonb);' || E'\n\n' ||
    'COMMIT;' || E'\n';

  v_size_kb := round((octet_length(v_backup_data::text)::numeric / 1024.0), 2);

  INSERT INTO public.system_backups (
    filename, backup_type, reports_count, profiles_count,
    standards_count, terms_count, backup_data, backup_sql, file_size_kb, created_at
  ) VALUES (
    v_filename, p_backup_type, v_reports_count, v_profiles_count,
    v_standards_count, v_terms_count, v_backup_data, v_backup_sql, v_size_kb, v_now
  ) RETURNING id INTO v_backup_id;

  -- Enforce retention: keep newest v_retention_limit backups on NAS
  DELETE FROM public.system_backups
  WHERE id NOT IN (
    SELECT id FROM public.system_backups ORDER BY created_at DESC LIMIT v_retention_limit
  );

  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Upgrade user_backups table structure
ALTER TABLE public.user_backups ADD COLUMN IF NOT EXISTS terms_count INTEGER DEFAULT 0;
ALTER TABLE public.user_backups ADD COLUMN IF NOT EXISTS backup_data JSONB;
ALTER TABLE public.user_backups ADD COLUMN IF NOT EXISTS backup_type TEXT DEFAULT 'manual_user';
ALTER TABLE public.user_backups ADD COLUMN IF NOT EXISTS file_size_kb NUMERIC(10, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_backups_user_created ON public.user_backups(user_id, created_at DESC);

-- Enable RLS on user_backups
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own backups" ON public.user_backups;
CREATE POLICY "Users can read own backups" ON public.user_backups
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'michael.liarzi@gmail.com');

DROP POLICY IF EXISTS "Users can insert own backups" ON public.user_backups;
CREATE POLICY "Users can insert own backups" ON public.user_backups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'michael.liarzi@gmail.com');

DROP POLICY IF EXISTS "Users can delete own backups" ON public.user_backups;
CREATE POLICY "Users can delete own backups" ON public.user_backups
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'michael.liarzi@gmail.com');

GRANT ALL ON TABLE public.user_backups TO postgres, authenticated, service_role, anon;

-- 3. Function to generate personal user backup
CREATE OR REPLACE FUNCTION public.generate_user_backup(p_user_id UUID, p_backup_type TEXT DEFAULT 'manual_user')
RETURNS UUID AS $$
DECLARE
  v_backup_id UUID;
  v_now TIMESTAMPTZ := now();
  v_date_str TEXT := to_char(v_now AT TIME ZONE 'Asia/Jerusalem', 'YYYY-MM-DD');
  v_time_str TEXT := to_char(v_now AT TIME ZONE 'Asia/Jerusalem', 'HH24MISS');
  v_email TEXT;
  v_safe_email TEXT;
  v_filename TEXT;
  v_reports_count INTEGER := 0;
  v_standards_count INTEGER := 0;
  v_terms_count INTEGER := 0;
  v_backup_data JSONB;
  v_backup_sql TEXT;
  v_size_kb NUMERIC(10, 2);
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  v_email := coalesce(v_profile.email, p_user_id::text);
  v_safe_email := regexp_replace(v_email, '[^a-zA-Z0-9_-]', '_', 'g');
  v_filename := 'backup-user-' || v_safe_email || '-' || v_date_str || '-' || v_time_str || '.sql';

  SELECT count(*) INTO v_standards_count FROM public.workday_standards WHERE user_id = p_user_id;
  SELECT count(*) INTO v_reports_count FROM public.reports WHERE user_id = p_user_id;
  SELECT count(*) INTO v_terms_count FROM public.employment_terms WHERE user_id = p_user_id;

  v_backup_data := jsonb_build_object(
    'version', '1.0',
    'created_at', v_now,
    'backup_type', p_backup_type,
    'user_id', p_user_id,
    'email', v_email,
    'profile', to_jsonb(v_profile),
    'workday_standards', coalesce((SELECT jsonb_agg(to_jsonb(w)) FROM public.workday_standards w WHERE w.user_id = p_user_id), '[]'::jsonb),
    'reports', coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM public.reports r WHERE r.user_id = p_user_id), '[]'::jsonb),
    'employment_terms', coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM public.employment_terms e WHERE e.user_id = p_user_id), '[]'::jsonb)
  );

  v_backup_sql := '-- ============================================================' || E'\n' ||
    '-- Employee Work Hours Dashboard - Personal User Backup' || E'\n' ||
    '-- User: ' || v_email || ' (ID: ' || p_user_id || ')' || E'\n' ||
    '-- Created: ' || to_char(v_now, 'YYYY-MM-DD HH24:MI:SS UTC') || E'\n' ||
    '-- Type: ' || p_backup_type || E'\n' ||
    '-- Reports: ' || v_reports_count || ', Standards: ' || v_standards_count || ', Terms: ' || v_terms_count || E'\n' ||
    '-- ============================================================' || E'\n' ||
    'BEGIN;' || E'\n\n' ||
    'SELECT public.restore_user_backup_data(' || quote_literal(v_backup_data::text) || '::jsonb);' || E'\n\n' ||
    'COMMIT;' || E'\n';

  v_size_kb := round((octet_length(v_backup_data::text)::numeric / 1024.0), 2);

  INSERT INTO public.user_backups (
    user_id, email, filename, reports_count, standards_count,
    terms_count, backup_type, backup_data, backup_sql, file_size_kb, created_at
  ) VALUES (
    p_user_id, v_email, v_filename, v_reports_count, v_standards_count,
    v_terms_count, p_backup_type, v_backup_data, v_backup_sql, v_size_kb, v_now
  ) RETURNING id INTO v_backup_id;

  -- Retention for user backups: keep latest 20 personal backups per user
  DELETE FROM public.user_backups
  WHERE user_id = p_user_id AND id NOT IN (
    SELECT id FROM public.user_backups WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 20
  );

  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to restore user backup from JSONB data directly
CREATE OR REPLACE FUNCTION public.restore_user_backup_data(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_rep_count INTEGER := 0;
  v_std_count INTEGER := 0;
  v_term_count INTEGER := 0;
  v_item JSONB;
BEGIN
  v_user_id := (p_data->>'user_id')::uuid;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'מזהה משתמש חסר בנתוני הגיבוי';
  END IF;

  -- 1. Restore Profile if present
  IF p_data ? 'profile' AND p_data->'profile' IS NOT NULL AND p_data->'profile' != 'null'::jsonb THEN
    INSERT INTO public.profiles (
      id, email, annual_vacation_quota, created_at, updated_at
    ) VALUES (
      v_user_id,
      p_data->'profile'->>'email',
      (p_data->'profile'->>'annual_vacation_quota')::numeric,
      coalesce((p_data->'profile'->>'created_at')::timestamptz, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      annual_vacation_quota = coalesce(EXCLUDED.annual_vacation_quota, public.profiles.annual_vacation_quota),
      updated_at = now();
  END IF;

  -- 2. Restore Workday Standards for THIS user only
  IF p_data ? 'workday_standards' THEN
    DELETE FROM public.workday_standards WHERE user_id = v_user_id;
    FOR v_item IN SELECT jsonb_array_elements(p_data->'workday_standards')
    LOOP
      INSERT INTO public.workday_standards (
        id, user_id, year, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, created_at, updated_at
      ) VALUES (
        coalesce((v_item->>'id')::uuid, gen_random_uuid()),
        v_user_id,
        (v_item->>'year')::integer,
        (v_item->>'m1')::integer,
        (v_item->>'m2')::integer,
        (v_item->>'m3')::integer,
        (v_item->>'m4')::integer,
        (v_item->>'m5')::integer,
        (v_item->>'m6')::integer,
        (v_item->>'m7')::integer,
        (v_item->>'m8')::integer,
        (v_item->>'m9')::integer,
        (v_item->>'m10')::integer,
        (v_item->>'m11')::integer,
        (v_item->>'m12')::integer,
        coalesce((v_item->>'created_at')::timestamptz, now()),
        now()
      );
      v_std_count := v_std_count + 1;
    END LOOP;
  END IF;

  -- 3. Restore Reports for THIS user only
  IF p_data ? 'reports' THEN
    DELETE FROM public.reports WHERE user_id = v_user_id;
    FOR v_item IN SELECT jsonb_array_elements(p_data->'reports')
    LOOP
      INSERT INTO public.reports (
        id, user_id, date, entry, exit, vacation_days, sick_days, reserve_days,
        classification, notes, order_type, unique_notes, shifts, created_at, updated_at
      ) VALUES (
        coalesce((v_item->>'id')::uuid, gen_random_uuid()),
        v_user_id,
        (v_item->>'date')::date,
        v_item->>'entry',
        v_item->>'exit',
        (v_item->>'vacation_days')::numeric,
        (v_item->>'sick_days')::numeric,
        (v_item->>'reserve_days')::numeric,
        v_item->>'classification',
        v_item->>'notes',
        v_item->>'order_type',
        v_item->>'unique_notes',
        coalesce(v_item->'shifts', '[]'::jsonb),
        coalesce((v_item->>'created_at')::timestamptz, now()),
        now()
      );
      v_rep_count := v_rep_count + 1;
    END LOOP;
  END IF;

  -- 4. Restore Employment Terms for THIS user only
  IF p_data ? 'employment_terms' THEN
    DELETE FROM public.employment_terms WHERE user_id = v_user_id;
    FOR v_item IN SELECT jsonb_array_elements(p_data->'employment_terms')
    LOOP
      INSERT INTO public.employment_terms (
        id, user_id, name, employment_type, start_date, end_date,
        job_scope_pct, daily_standard_sun_wed, daily_standard_thu,
        overtime_eligible, hourly_rate, notes, created_at, updated_at
      ) VALUES (
        coalesce((v_item->>'id')::uuid, gen_random_uuid()),
        v_user_id,
        v_item->>'name',
        v_item->>'employment_type',
        (v_item->>'start_date')::date,
        (v_item->>'end_date')::date,
        (v_item->>'job_scope_pct')::numeric,
        (v_item->>'daily_standard_sun_wed')::numeric,
        (v_item->>'daily_standard_thu')::numeric,
        (v_item->>'overtime_eligible')::boolean,
        (v_item->>'hourly_rate')::numeric,
        v_item->>'notes',
        coalesce((v_item->>'created_at')::timestamptz, now()),
        now()
      );
      v_term_count := v_term_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'workday_standards_restored', v_std_count,
    'reports_restored', v_rep_count,
    'employment_terms_restored', v_term_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to restore user backup by ID
CREATE OR REPLACE FUNCTION public.restore_user_backup_by_id(p_backup_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_backup_rec RECORD;
  v_safety_id UUID;
  v_result JSONB;
BEGIN
  SELECT * INTO v_backup_rec FROM public.user_backups WHERE id = p_backup_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'גיבוי בעל מזהה % לא נמצא', p_backup_id;
  END IF;

  -- Ensure user owns this backup or caller is superuser/admin
  IF v_backup_rec.user_id != p_user_id THEN
    RAISE EXCEPTION 'אין הרשאה לשחזר גיבוי של משתמש אחר';
  END IF;

  -- 1. Create automatic personal pre-restore safety backup!
  v_safety_id := public.generate_user_backup(p_user_id, 'pre_restore_safety');

  -- 2. Restore user data
  v_result := public.restore_user_backup_data(v_backup_rec.backup_data);

  RETURN jsonb_build_object(
    'success', true,
    'safety_backup_id', v_safety_id,
    'restored_backup_id', p_backup_id,
    'restored_filename', v_backup_rec.filename,
    'details', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.generate_user_backup(UUID, TEXT) TO postgres, authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.restore_user_backup_data(JSONB) TO postgres, authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.restore_user_backup_by_id(UUID, UUID) TO postgres, authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
`;

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log('[Migration] Running SQL migration on NAS PostgreSQL...');
  await client.query(SQL_MIGRATION);
  console.log('[Migration] Migration completed successfully.');

  // Test personal backup for current user
  const userRes = await client.query("SELECT id, email FROM public.profiles LIMIT 1;");
  if (userRes.rows.length > 0) {
    const testUser = userRes.rows[0];
    console.log('[Test User Backup] Generating test backup for user:', testUser.email);
    const testGen = await client.query("SELECT public.generate_user_backup($1, 'manual_user') as id;", [testUser.id]);
    const bId = testGen.rows[0].id;
    console.log('[Test User Backup] Created backup ID:', bId);

    console.log('[Test User Restore] Restoring test backup ID:', bId);
    const testRest = await client.query("SELECT public.restore_user_backup_by_id($1, $2) as result;", [bId, testUser.id]);
    console.log('[Test User Restore] Result:', JSON.stringify(testRest.rows[0].result, null, 2));
  }

  await client.end();
}

run().catch(console.error);
