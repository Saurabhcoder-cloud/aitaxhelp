-- ==============================================================================
-- Migration: 20260925_admin_audit_and_roles.sql
-- Description: Adds role management to profiles, internal admin notes to
-- professional leads, and creates the immutable admin audit logging table.
-- ==============================================================================

-- 1. Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'compliance_officer', 'support_specialist'));

-- 2. Add internal_notes JSONB column to professional leads for administrative tracking
ALTER TABLE public.tax_professional_leads
ADD COLUMN IF NOT EXISTS internal_notes JSONB DEFAULT '[]'::jsonb;

-- 3. Create Admin Audit Logs Table (immutable privileged action tracking)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes for Audit Trail
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON public.admin_audit_logs(target_type, target_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit Log RLS Policies: Strictly restricted to administrators
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'compliance_officer')
    )
  );

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );
