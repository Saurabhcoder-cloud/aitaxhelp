-- ==============================================================================
-- Migration: 20261002000000_preparation_household_snapshot.sql
-- Description: Adds household and dependent snapshot to tax_preparation_sessions.
-- Preserves existing RLS, indexes, and session ownership.
-- ==============================================================================

ALTER TABLE public.tax_preparation_sessions
  ADD COLUMN IF NOT EXISTS household_snapshot JSONB NOT NULL DEFAULT '{"filingStatus":"single","dependents":[]}'::jsonb;

-- Comment describing the new column
COMMENT ON COLUMN public.tax_preparation_sessions.household_snapshot IS
  'Structured family, spouse, and dependent snapshot for federal tax filing status and credit calculations.';
