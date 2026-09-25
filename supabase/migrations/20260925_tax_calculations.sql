-- ==============================================================================
-- Migration: 20260925_tax_calculations.sql
-- Description: Creates the production-grade tax_calculations history table with
-- strict Row Level Security (RLS) policies for user ownership.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL,
  tax_year INT NOT NULL,
  filing_status TEXT NOT NULL,
  title TEXT,
  input_snapshot JSONB NOT NULL,
  result_snapshot JSONB NOT NULL,
  engine_version TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tax_calcs_user_id ON public.tax_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_calcs_user_created ON public.tax_calculations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_calcs_user_year ON public.tax_calculations(user_id, tax_year);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can only read their own saved calculations
CREATE POLICY "Users can view own tax calculations"
  ON public.tax_calculations
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. INSERT: Users can only insert records where user_id matches their auth identity
CREATE POLICY "Users can insert own tax calculations"
  ON public.tax_calculations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can only update their own records
CREATE POLICY "Users can update own tax calculations"
  ON public.tax_calculations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can only delete their own records
CREATE POLICY "Users can delete own tax calculations"
  ON public.tax_calculations
  FOR DELETE
  USING (auth.uid() = user_id);
