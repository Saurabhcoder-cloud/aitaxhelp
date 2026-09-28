-- ==============================================================================
-- Migration: 20260925_professional_leads.sql
-- Description: Creates the production-grade tax_professional_leads table with
-- calculation references, status tracking, and strict Row Level Security (RLS)
-- policies ensuring user ownership isolation.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tax_professional_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_id UUID REFERENCES public.tax_calculations(id) ON DELETE SET NULL,
  tax_year INT NOT NULL,
  filing_status TEXT NOT NULL,
  taxpayer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  preferred_contact_method TEXT NOT NULL DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone')),
  urgency TEXT NOT NULL DEFAULT 'planning_ahead' CHECK (urgency IN ('immediate', 'this_month', 'planning_ahead')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Deduplication Indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.tax_professional_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_calc_id ON public.tax_professional_leads(calculation_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.tax_professional_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.tax_professional_leads(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tax_professional_leads ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Users can only view their own submitted leads
CREATE POLICY "Users can view own professional leads"
  ON public.tax_professional_leads
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. INSERT: Users can only insert leads where user_id matches their authenticated identity
CREATE POLICY "Users can insert own professional leads"
  ON public.tax_professional_leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users cannot modify submitted leads unless they are the owner
CREATE POLICY "Users can update own professional leads"
  ON public.tax_professional_leads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
