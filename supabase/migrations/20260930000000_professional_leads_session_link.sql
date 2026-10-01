-- ==============================================================================
-- Migration: 20260930000000_professional_leads_session_link.sql
-- Description: Links professional review inquiries to active preparation sessions,
-- tracks review type (CPA, EA, Tax Pro), professional assignment, and session snapshot.
-- Applied after 20260929000000_preparation_calculation_link.sql.
-- ==============================================================================

ALTER TABLE public.tax_professional_leads
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.tax_preparation_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_type TEXT DEFAULT 'cpa' CHECK (review_type IN ('cpa', 'enrolled_agent', 'tax_professional')),
  ADD COLUMN IF NOT EXISTS assigned_professional_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_professional_name TEXT,
  ADD COLUMN IF NOT EXISTS session_snapshot JSONB DEFAULT NULL;

-- Performance index for session lookups
CREATE INDEX IF NOT EXISTS idx_leads_session_id
  ON public.tax_professional_leads(session_id);
