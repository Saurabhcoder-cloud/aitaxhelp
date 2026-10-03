-- ==============================================================================
-- Migration: 20261003000000_professional_review_workflow.sql
-- Description: Creates CPA/EA professional review cases, review comments/findings,
-- and review audit events with strict Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Table: professional_review_cases
CREATE TABLE IF NOT EXISTS public.professional_review_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.tax_preparation_sessions(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.tax_professional_leads(id) ON DELETE SET NULL,
  tax_year INT NOT NULL,
  filing_status TEXT NOT NULL,
  taxpayer_name TEXT NOT NULL,
  taxpayer_email TEXT NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'cpa' CHECK (review_type IN ('cpa', 'enrolled_agent', 'tax_professional')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
    'REQUESTED', 'UNASSIGNED', 'ASSIGNED', 'IN_REVIEW', 'CHANGES_REQUESTED',
    'READY_FOR_FINAL_REVIEW', 'REVIEW_COMPLETED', 'CLOSED', 'CANCELLED'
  )),
  assigned_professional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_professional_name TEXT,
  assigned_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  taxpayer_notes TEXT,
  professional_notes TEXT,
  snapshot JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes for Cases
CREATE INDEX IF NOT EXISTS idx_review_cases_user_id ON public.professional_review_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_review_cases_session_id ON public.professional_review_cases(session_id);
CREATE INDEX IF NOT EXISTS idx_review_cases_assigned_pro_id ON public.professional_review_cases(assigned_professional_id);
CREATE INDEX IF NOT EXISTS idx_review_cases_status ON public.professional_review_cases(status);

-- 2. Table: professional_review_comments
CREATE TABLE IF NOT EXISTS public.professional_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.professional_review_cases(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('taxpayer', 'professional', 'admin', 'system')),
  section TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'REQUIRES_ACTION')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Comments
CREATE INDEX IF NOT EXISTS idx_review_comments_case_id ON public.professional_review_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_section ON public.professional_review_comments(section);
CREATE INDEX IF NOT EXISTS idx_review_comments_severity ON public.professional_review_comments(severity);

-- 3. Table: professional_review_events (Audit Trail)
CREATE TABLE IF NOT EXISTS public.professional_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.professional_review_cases(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.tax_preparation_sessions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('taxpayer', 'professional', 'admin', 'system')),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Events
CREATE INDEX IF NOT EXISTS idx_review_events_case_id ON public.professional_review_events(case_id);
CREATE INDEX IF NOT EXISTS idx_review_events_created_at ON public.professional_review_events(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.professional_review_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_review_events ENABLE ROW LEVEL SECURITY;

-- 1. Cases Policies
CREATE POLICY "Taxpayers view own cases"
  ON public.professional_review_cases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Assigned professionals view authorized cases"
  ON public.professional_review_cases
  FOR SELECT
  USING (auth.uid() = assigned_professional_id);

CREATE POLICY "Taxpayers insert own cases"
  ON public.professional_review_cases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Taxpayers update own open cases"
  ON public.professional_review_cases
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Assigned professionals update assigned cases"
  ON public.professional_review_cases
  FOR UPDATE
  USING (auth.uid() = assigned_professional_id)
  WITH CHECK (auth.uid() = assigned_professional_id);

-- 2. Comments Policies
CREATE POLICY "View comments for authorized cases"
  ON public.professional_review_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_review_cases c
      WHERE c.id = case_id AND (c.user_id = auth.uid() OR c.assigned_professional_id = auth.uid())
    )
  );

CREATE POLICY "Insert comments on authorized cases"
  ON public.professional_review_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional_review_cases c
      WHERE c.id = case_id AND (c.user_id = auth.uid() OR c.assigned_professional_id = auth.uid())
    )
  );

-- 3. Events Policies
CREATE POLICY "View events for authorized cases"
  ON public.professional_review_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_review_cases c
      WHERE c.id = case_id AND (c.user_id = auth.uid() OR c.assigned_professional_id = auth.uid())
    )
  );
