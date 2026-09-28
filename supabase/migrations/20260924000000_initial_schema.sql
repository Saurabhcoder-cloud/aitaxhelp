-- ==============================================================================
-- Migration: 20260924000000_initial_schema.sql
-- Description: Foundational tables required before the 20260925 migrations.
--
-- Included from supabase/schema.sql because no later migration creates them:
--   profiles, tax_profiles, saved_calculations, ai_conversations, ai_messages
--   plus their indexes, RLS, and policies.
--
-- tax_calculations and tax_professional_leads are created here as tables only.
-- Their indexes, RLS, and policies stay in:
--   20260925_tax_calculations.sql
--   20260925_professional_leads.sql
-- Those files use CREATE TABLE IF NOT EXISTS, so this table-only create is a
-- no-op for them and does not duplicate policies. The tables must exist first
-- because 20260925_admin_audit_and_roles.sql alters tax_professional_leads,
-- and 20260925_professional_leads.sql references tax_calculations, both of
-- which sort before 20260925_tax_calculations.sql.
--
-- The leads table matches 20260925_professional_leads.sql, not the older
-- column list in schema.sql. Using the older list would make the later
-- CREATE TABLE IF NOT EXISTS skip and leave the production columns missing.
--
-- Excluded:
--   tax_preparation_sessions (20260928_tax_preparation_sessions.sql)
--   profiles.role and leads.internal_notes (20260925_admin_audit_and_roles.sql)
-- ==============================================================================

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tax profiles
CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_tax_year INT NOT NULL DEFAULT 2024,
  filing_status TEXT NOT NULL DEFAULT 'single',
  has_w2_income BOOLEAN NOT NULL DEFAULT FALSE,
  has_1099_income BOOLEAN NOT NULL DEFAULT FALSE,
  has_business_expenses BOOLEAN NOT NULL DEFAULT FALSE,
  state_of_residence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_tax_profiles_user UNIQUE (user_id)
);

-- 3. Saved calculations
CREATE TABLE IF NOT EXISTS public.saved_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  calculation_id TEXT NOT NULL,
  calculator_type TEXT NOT NULL,
  tax_year INT NOT NULL,
  inputs JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AI conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI messages
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attached_calculation_id UUID REFERENCES public.saved_calculations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tax calculations table only.
-- Indexes, RLS, and policies are applied by 20260925_tax_calculations.sql.
CREATE TABLE IF NOT EXISTS public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL,
  tax_year INT NOT NULL,
  filing_status TEXT NOT NULL,
  title TEXT,
  input_snapshot JSONB NOT NULL,
  result_snapshot JSONB NOT NULL,
  engine_version TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Professional leads table only, matching 20260925_professional_leads.sql.
-- Indexes, RLS, and policies are applied by that migration.
-- internal_notes is added later by 20260925_admin_audit_and_roles.sql.
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

-- Indexes owned only by this baseline
CREATE INDEX IF NOT EXISTS idx_saved_calcs_user_id ON public.saved_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_id ON public.ai_messages(conversation_id);

-- RLS for tables that no later migration secures
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and update own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Users can manage own tax profile"
  ON public.tax_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved calculations"
  ON public.saved_calculations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own AI conversations"
  ON public.ai_conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own AI messages"
  ON public.ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
    )
  );
