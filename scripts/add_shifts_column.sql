-- ==============================================================================
-- Migration: Add shifts JSONB column to reports table for multi-shift support
-- ==============================================================================

ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS shifts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reports.shifts IS 'Array of work shift segments: [{entry: "HH:mm", exit: "HH:mm", description: "string"}]';
