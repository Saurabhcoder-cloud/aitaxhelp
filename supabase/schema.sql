-- ==============================================================================
-- TaxAIHelp Database Schema Blueprint (PostgreSQL / Supabase)
-- Domain: taxaihelp.com
-- ==============================================================================

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tax Profiles Table (stores taxpayer defaults)
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

-- 3. Saved Calculations Table
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

-- 4. AI Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI Messages Table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attached_calculation_id UUID REFERENCES public.saved_calculations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tax Professional Leads Table (CPA / EA matching)
CREATE TABLE IF NOT EXISTS public.tax_professional_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tax_payer_type TEXT NOT NULL,
  urgency TEXT NOT NULL,
  income_range TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'matched', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tax Calculations Table (Production History Store)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_calcs_user_id ON public.saved_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_id ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.tax_professional_leads(status);
CREATE INDEX IF NOT EXISTS idx_tax_calcs_user_id ON public.tax_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_calcs_user_created ON public.tax_calculations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_calcs_user_year ON public.tax_calculations(user_id, tax_year);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_professional_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- Baseline RLS Policies
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

-- Tax Calculations RLS Policies (Granular CRUD)
CREATE POLICY "Users can view own tax calculations"
  ON public.tax_calculations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax calculations"
  ON public.tax_calculations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax calculations"
  ON public.tax_calculations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax calculations"
  ON public.tax_calculations FOR DELETE
  USING (auth.uid() = user_id);

