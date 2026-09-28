-- Adds durable income discovery to an existing preparation session.
-- Applied after 20260928_tax_preparation_sessions.sql.

ALTER TABLE public.tax_preparation_sessions
  ADD COLUMN IF NOT EXISTS income_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
