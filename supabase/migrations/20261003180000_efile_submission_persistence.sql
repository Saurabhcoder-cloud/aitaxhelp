-- =============================================================================
-- Migration: 20261003180000_efile_submission_persistence.sql
-- Description: Creates persistent storage and audit logs for IRS MeF federal e-file submissions
-- Phase: Phase 10 — IRS MeF / Authorized Provider Integration Readiness
-- =============================================================================

-- 1. E-File Submissions Table
CREATE TABLE IF NOT EXISTS public.efile_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.tax_preparation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_year INTEGER NOT NULL,
    snapshot_id UUID NOT NULL,
    snapshot_hash TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'disconnected',
    provider_submission_id TEXT,
    provider_correlation_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    idempotency_key TEXT NOT NULL UNIQUE,
    is_test_submission BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_code TEXT,
    rejection_message TEXT,
    rejection_category TEXT,
    rejection_rule_number TEXT,
    taxpayer_action TEXT,
    last_provider_response_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_efile_submissions_user_id ON public.efile_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_efile_submissions_session_id ON public.efile_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_efile_submissions_status ON public.efile_submissions(status);
CREATE INDEX IF NOT EXISTS idx_efile_submissions_provider_sub_id ON public.efile_submissions(provider_submission_id);
CREATE INDEX IF NOT EXISTS idx_efile_submissions_snapshot_hash ON public.efile_submissions(snapshot_hash);

-- 2. E-File Submission Events (Audit Trail)
CREATE TABLE IF NOT EXISTS public.efile_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.efile_submissions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_efile_events_submission_id ON public.efile_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_efile_events_user_id ON public.efile_events(user_id);

-- 3. E-File Provider Raw Responses (Webhook / Diagnostic log)
CREATE TABLE IF NOT EXISTS public.efile_provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.efile_submissions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_submission_id TEXT,
    response_type TEXT NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_efile_provider_responses_sub_id ON public.efile_provider_responses(submission_id);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE public.efile_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efile_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efile_provider_responses ENABLE ROW LEVEL SECURITY;

-- Submissions policies
CREATE POLICY "Taxpayers can view their own efile submissions"
    ON public.efile_submissions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Taxpayers can insert initial submission for their session"
    ON public.efile_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Taxpayers can view events for their submissions"
    ON public.efile_events
    FOR SELECT
    USING (auth.uid() = user_id);

-- Provider responses policies
CREATE POLICY "Taxpayers can view responses for their submissions"
    ON public.efile_provider_responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.efile_submissions s
            WHERE s.id = submission_id AND s.user_id = auth.uid()
        )
    );
