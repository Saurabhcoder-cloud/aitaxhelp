-- Document metadata and deduction discovery for an existing preparation session.
-- Does not store file contents. Apply after 20260928010000_preparation_income_snapshot.sql.

ALTER TABLE public.tax_preparation_sessions
  ADD COLUMN IF NOT EXISTS documents_snapshot JSONB NOT NULL DEFAULT '{"documents":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS deductions_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
