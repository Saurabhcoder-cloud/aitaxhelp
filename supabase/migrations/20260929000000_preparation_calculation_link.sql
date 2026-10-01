-- ==============================================================================
-- Migration: 20260929000000_preparation_calculation_link.sql
-- Description: Links persisted tax calculations and results to preparation sessions.
-- Applied after 20260928020000_preparation_documents_deductions.sql.
-- ==============================================================================

ALTER TABLE public.tax_preparation_sessions
  ADD COLUMN IF NOT EXISTS calculation_id UUID REFERENCES public.tax_calculations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calculation_snapshot JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_prep_sessions_calc_id
  ON public.tax_preparation_sessions(calculation_id);
