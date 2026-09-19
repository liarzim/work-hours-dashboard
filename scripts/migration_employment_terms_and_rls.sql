-- ==============================================================================
-- 24H Work Dashboard: Migration for Employment Terms with History & Strict RLS
-- ==============================================================================

-- 1. Create employment_terms table if not exists
CREATE TABLE IF NOT EXISTS public.employment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'תנאי העסקה רגילים',
  employment_type VARCHAR(30) NOT NULL DEFAULT 'monthly_overtime', -- 'monthly_overtime' | 'global' | 'hourly' | 'custom'
  start_date DATE NOT NULL,
  end_date DATE, -- NULL represents ongoing/current term
  job_scope_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  daily_standard_sun_wed NUMERIC(4,2) NOT NULL DEFAULT 9.00,
  daily_standard_thu NUMERIC(4,2) NOT NULL DEFAULT 8.50,
  overtime_eligible BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal lookup performance by user and date range
CREATE INDEX IF NOT EXISTS idx_employment_terms_user_dates 
  ON public.employment_terms(user_id, start_date, end_date);

-- ==============================================================================
-- 2. Enable Row Level Security (RLS) on all public tables
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workday_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_terms ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. Strict RLS Policies for user data isolation (auth.uid() = user_id)
-- ==============================================================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- --- WORKDAY STANDARDS ---
DROP POLICY IF EXISTS "standards_select_own" ON public.workday_standards;
CREATE POLICY "standards_select_own" ON public.workday_standards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "standards_insert_own" ON public.workday_standards;
CREATE POLICY "standards_insert_own" ON public.workday_standards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "standards_update_own" ON public.workday_standards;
CREATE POLICY "standards_update_own" ON public.workday_standards
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "standards_delete_own" ON public.workday_standards;
CREATE POLICY "standards_delete_own" ON public.workday_standards
  FOR DELETE USING (auth.uid() = user_id);

-- --- REPORTS ---
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_update_own" ON public.reports;
CREATE POLICY "reports_update_own" ON public.reports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_delete_own" ON public.reports;
CREATE POLICY "reports_delete_own" ON public.reports
  FOR DELETE USING (auth.uid() = user_id);

-- --- EMPLOYMENT TERMS ---
DROP POLICY IF EXISTS "terms_select_own" ON public.employment_terms;
CREATE POLICY "terms_select_own" ON public.employment_terms
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "terms_insert_own" ON public.employment_terms;
CREATE POLICY "terms_insert_own" ON public.employment_terms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "terms_update_own" ON public.employment_terms;
CREATE POLICY "terms_update_own" ON public.employment_terms
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "terms_delete_own" ON public.employment_terms;
CREATE POLICY "terms_delete_own" ON public.employment_terms
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. Automatically populate initial default term for existing users (if none exist)
-- ==============================================================================
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
SELECT 
  p.id,
  'חודשי עם שעות נוספות (ברירת מחדל)',
  'monthly_overtime',
  '2019-01-01'::DATE,
  NULL,
  100.00,
  9.00,
  8.50,
  true,
  'נוצר אוטומטית כבסיס היסטורי'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.employment_terms t WHERE t.user_id = p.id
);
