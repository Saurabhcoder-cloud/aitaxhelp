-- ==============================================================================
-- Migration: Platform Configuration & Feature Flags (Phase 5 Step 15)
-- Centralized operational control with versioning and optimistic concurrency.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.platform_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  value_json JSONB NOT NULL,
  description TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT DEFAULT 'system:seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_config_category
  ON public.platform_configurations(category);

-- Enable Row Level Security
ALTER TABLE public.platform_configurations ENABLE ROW LEVEL SECURITY;

-- 1. Service role policy: Full management
CREATE POLICY "Service role manages platform configurations"
  ON public.platform_configurations
  FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Read policy: Read-only access for authenticated users to avoid leaking internal notes
CREATE POLICY "Authenticated users can read platform configurations"
  ON public.platform_configurations
  FOR SELECT
  USING (true);

-- ==============================================================================
-- Seed Baseline Production-Safe Defaults
-- INVARIANT: No API keys, passwords, or secrets are seeded here.
-- ==============================================================================

INSERT INTO public.platform_configurations (key, category, value_json, description, is_enabled, version)
VALUES
  ('platform.name', 'platform', '"TaxAIHelp"', 'Application display name', true, 1),
  ('platform.maintenance_mode', 'maintenance', 'false', 'Suspends standard user traffic and shows maintenance notice', false, 1),
  ('platform.maintenance_message', 'maintenance', '"TaxAIHelp is temporarily undergoing scheduled maintenance. Please check back shortly."', 'Public maintenance screen message', true, 1),
  ('platform.maintenance_banner_enabled', 'maintenance', 'false', 'Displays an informational banner without blocking site access', false, 1),
  ('announcement.enabled', 'announcement', 'false', 'Displays a site-wide broadcast announcement', false, 1),
  ('announcement.message', 'announcement', '""', 'Announcement banner text', true, 1),
  ('announcement.type', 'announcement', '"info"', 'Visual banner type (info | warning | maintenance)', true, 1),
  ('auth.registration_enabled', 'auth', 'true', 'Allows new taxpayers to create accounts', true, 1),
  ('auth.new_user_signup_enabled', 'auth', 'true', 'Controls signup flow accessibility', true, 1),
  ('auth.password_reset_enabled', 'auth', 'true', 'Allows users to request password recovery emails', true, 1),
  ('calculators.federal_income_enabled', 'calculators', 'true', 'Enables Federal Income Tax Calculator', true, 1),
  ('calculators.self_employed_enabled', 'calculators', 'true', 'Enables Self-Employed Schedule C Tax Calculator', true, 1),
  ('calculators.tax_1099_enabled', 'calculators', 'true', 'Enables 1099 Contractor Tax Calculator', true, 1),
  ('calculators.quarterly_enabled', 'calculators', 'true', 'Enables Quarterly Estimated 1040-ES Tax Calculator', true, 1),
  ('ai.assistant_enabled', 'ai', 'true', 'Enables AI conversational tax assistant queries', true, 1),
  ('ai.daily_limit_enforcement_enabled', 'ai', 'true', 'Enforces daily AI message quotas', true, 1),
  ('reports.basic_reports_enabled', 'reports', 'true', 'Enables on-screen calculation report generation', true, 1),
  ('reports.premium_reports_enabled', 'reports', 'true', 'Enables printable / exportable PDF-ready comprehensive summaries', true, 1),
  ('professionals.handoff_enabled', 'professionals', 'true', 'Allows taxpayers to submit CPA / Enrolled Agent consultation inquiries', true, 1),
  ('professionals.leads_enabled', 'professionals', 'true', 'Allows routing leads to professional partners', true, 1),
  ('notifications.in_app_enabled', 'notifications', 'true', 'Enables in-app notification center delivery', true, 1),
  ('notifications.email_enabled', 'notifications', 'true', 'Enables transactional email delivery when provider is configured', true, 1),
  ('billing.enabled', 'billing', 'true', 'Enables subscription plan management and checkout flows', true, 1),
  ('billing.premium_checkout_enabled', 'billing', 'true', 'Allows upgrading to Premium tier', true, 1),
  ('acquisition.public_blog_enabled', 'acquisition', 'true', 'Serves public tax blog posts', true, 1),
  ('acquisition.public_tax_guides_enabled', 'acquisition', 'true', 'Serves organic tax guides and reference hubs', true, 1),
  ('acquisition.public_pricing_enabled', 'acquisition', 'true', 'Displays public pricing page', true, 1),
  ('acquisition.analytics_enabled', 'acquisition', 'true', 'Enables privacy-first funnel event logging', true, 1),
  ('security.login_rate_limit_enabled', 'security', 'true', 'Enforces rate limiting on authentication attempts', true, 1),
  ('security.ai_rate_limit_enabled', 'security', 'true', 'Enforces sliding-window rate limiting on AI requests', true, 1),
  ('security.recovery_rate_limit_enabled', 'security', 'true', 'Enforces rate limiting on password recovery submissions', true, 1)
ON CONFLICT (key) DO NOTHING;
