-- ============================================================================
-- TaxAIHelp Production Data Management, Retention & Disaster Recovery Migration
-- Migration: 20260925_data_management.sql
--
-- CRITICAL PRIVACY & SAFETY INVARIANTS:
-- 1. Metadata and operational runs only. NEVER stores taxpayer SSNs, EINs,
--    income, liabilities, bank accounts, or calculation snapshots.
-- 2. Strictly administrator and service-role accessible via RLS.
-- ============================================================================

-- 1. Data Retention Policies Table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset TEXT UNIQUE NOT NULL,
    retention_mode TEXT NOT NULL,
    retention_period TEXT NOT NULL,
    user_deletion_behavior TEXT NOT NULL,
    export_behavior TEXT NOT NULL,
    legal_hold_supported BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

-- 2. Legal Holds Table
CREATE TABLE IF NOT EXISTS public.legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset TEXT NOT NULL,
    record_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at TIMESTAMPTZ,
    released_by UUID
);

-- 3. Data Health & Integrity Runs Table
CREATE TABLE IF NOT EXISTS public.data_health_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type TEXT NOT NULL, -- 'integrity' | 'retention_preview' | 'backup_check'
    status TEXT NOT NULL,   -- 'PASS' | 'WARN' | 'FAIL'
    summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 4. Restore Verification Runs Table
CREATE TABLE IF NOT EXISTS public.restore_verification_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,   -- 'NOT_CONFIGURED' | 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED'
    checks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 5. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_legal_holds_dataset_record ON public.legal_holds(dataset, record_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_is_active ON public.legal_holds(is_active);
CREATE INDEX IF NOT EXISTS idx_data_health_runs_created ON public.data_health_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_restore_verification_runs_created ON public.restore_verification_runs(started_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_health_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_verification_runs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: Service Role Access
CREATE POLICY data_retention_policies_service_role ON public.data_retention_policies
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY legal_holds_service_role ON public.legal_holds
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY data_health_runs_service_role ON public.data_health_runs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY restore_verification_runs_service_role ON public.restore_verification_runs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. RLS Policies: Administrator & Compliance Access
CREATE POLICY data_retention_policies_admin ON public.data_retention_policies
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')));

CREATE POLICY legal_holds_admin ON public.legal_holds
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')));

CREATE POLICY data_health_runs_admin ON public.data_health_runs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')));

CREATE POLICY restore_verification_runs_admin ON public.restore_verification_runs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')));
