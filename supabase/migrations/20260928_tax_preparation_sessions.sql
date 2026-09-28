-- ==============================================================================
-- Migration: 20260928_tax_preparation_sessions.sql
-- Description: Durable Start My Taxes preparation sessions with user ownership.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tax_preparation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tax_profile_id UUID REFERENCES public.tax_profiles(id) ON DELETE SET NULL,
  tax_year INT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_progress', 'calculation_ready', 'review', 'completed')),
  current_step TEXT NOT NULL CHECK (current_step IN ('taxpayer_profile', 'income', 'documents', 'deductions', 'calculation', 'review')),
  steps JSONB NOT NULL,
  profile_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prep_sessions_user_id ON public.tax_preparation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prep_sessions_user_updated ON public.tax_preparation_sessions(user_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prep_sessions_one_open
  ON public.tax_preparation_sessions(user_id)
  WHERE status <> 'completed';

ALTER TABLE public.tax_preparation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preparation sessions"
  ON public.tax_preparation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preparation sessions"
  ON public.tax_preparation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preparation sessions"
  ON public.tax_preparation_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preparation sessions"
  ON public.tax_preparation_sessions FOR DELETE
  USING (auth.uid() = user_id);
