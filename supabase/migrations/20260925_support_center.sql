-- ============================================================================
-- TaxAIHelp Production Support Center & Issue Reporting Migration
-- Migration: 20260925_support_center.sql
--
-- CRITICAL PRIVACY INVARIANT:
-- Support tickets NEVER store raw taxpayer SSNs, EINs, bank accounts, wages,
-- liabilities, or refunds. Context is strictly limited to safe identifiers.
-- ============================================================================

-- 1. Create support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'OPEN',
    assigned_admin_id UUID,
    safe_context JSONB,
    rating INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- 2. Create support messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL,
    author_type TEXT NOT NULL,
    body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for high-performance administrative and user queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin ON public.support_tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_author ON public.support_messages(author_user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_is_internal ON public.support_messages(is_internal);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for support_tickets
-- Service role full access
CREATE POLICY support_tickets_service_role ON public.support_tickets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated Users: View own tickets
CREATE POLICY support_tickets_select_user ON public.support_tickets
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated Users: Create own tickets
CREATE POLICY support_tickets_insert_user ON public.support_tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authenticated Users: Update own tickets (e.g. resolve / reopen)
CREATE POLICY support_tickets_update_user ON public.support_tickets
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Administrators: Full access to all tickets
CREATE POLICY support_tickets_admin_all ON public.support_tickets
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'support_specialist')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'support_specialist')
        )
    );

-- 6. RLS Policies for support_messages
-- Service role full access
CREATE POLICY support_messages_service_role ON public.support_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated Users: View non-internal messages belonging to own tickets
CREATE POLICY support_messages_select_user ON public.support_messages
    FOR SELECT
    TO authenticated
    USING (
        is_internal = false
        AND EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

-- Authenticated Users: Insert public messages into own tickets
CREATE POLICY support_messages_insert_user ON public.support_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_internal = false
        AND author_user_id = auth.uid()
        AND author_type = 'USER'
        AND EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

-- Administrators: Full access to all messages (including internal notes)
CREATE POLICY support_messages_admin_all ON public.support_messages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'support_specialist')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'support_specialist')
        )
    );
