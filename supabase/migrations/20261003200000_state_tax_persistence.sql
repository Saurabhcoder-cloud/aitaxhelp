-- =============================================================================
-- Migration: 20261003200000_state_tax_persistence.sql
-- Description: State Tax Returns, Snapshots, and State E-File Persistence
-- System: TaxAIHelp (Phase 11 State Tax Engines & Return Preparation)
-- =============================================================================

-- 1. State Tax Returns (Snapshots & Calculations)
CREATE TABLE IF NOT EXISTS public.state_tax_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.tax_preparation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL,
    tax_year INTEGER NOT NULL,
    engine_version VARCHAR(50) NOT NULL,
    rules_version VARCHAR(50) NOT NULL,
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    frozen_at TIMESTAMPTZ,
    checksum_sha256 VARCHAR(64) NOT NULL,
    state_return_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_state_return_session_state UNIQUE (session_id, state_code)
);

-- Indexes for state returns
CREATE INDEX IF NOT EXISTS idx_state_returns_user_id ON public.state_tax_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_state_returns_session_id ON public.state_tax_returns(session_id);
CREATE INDEX IF NOT EXISTS idx_state_returns_state_year ON public.state_tax_returns(state_code, tax_year);

-- Enable RLS
ALTER TABLE public.state_tax_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own state tax returns"
    ON public.state_tax_returns FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own state tax returns"
    ON public.state_tax_returns FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own state tax returns"
    ON public.state_tax_returns FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own state tax returns"
    ON public.state_tax_returns FOR DELETE
    USING (auth.uid() = user_id);

-- 2. State E-File Submissions
CREATE TABLE IF NOT EXISTS public.state_efile_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.tax_preparation_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL,
    tax_year INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMISSION_PENDING',
    provider_id VARCHAR(50) NOT NULL,
    provider_submission_id VARCHAR(100),
    provider_status VARCHAR(50),
    provider_message TEXT,
    state_acknowledgment_number VARCHAR(100),
    rejection_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
    snapshot_checksum VARCHAR(64) NOT NULL,
    submitted_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for state e-file submissions
CREATE INDEX IF NOT EXISTS idx_state_efile_submissions_user ON public.state_efile_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_state_efile_submissions_session ON public.state_efile_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_state_efile_submissions_state ON public.state_efile_submissions(state_code, status);

-- Enable RLS
ALTER TABLE public.state_efile_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own state e-file submissions"
    ON public.state_efile_submissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own state e-file submissions"
    ON public.state_efile_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own state e-file submissions"
    ON public.state_efile_submissions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. State E-File Events (Audit Trail)
CREATE TABLE IF NOT EXISTS public.state_efile_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.state_efile_submissions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for state e-file events
CREATE INDEX IF NOT EXISTS idx_state_efile_events_sub_id ON public.state_efile_events(submission_id);

-- Enable RLS
ALTER TABLE public.state_efile_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their own state e-file submissions"
    ON public.state_efile_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.state_efile_submissions s
            WHERE s.id = state_efile_events.submission_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert events for their own state e-file submissions"
    ON public.state_efile_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.state_efile_submissions s
            WHERE s.id = state_efile_events.submission_id
            AND s.user_id = auth.uid()
        )
    );
