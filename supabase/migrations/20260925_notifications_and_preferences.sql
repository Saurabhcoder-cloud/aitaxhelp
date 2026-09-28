-- ==============================================================================
-- Migration: Notifications, Delivery Logs, and Communication Preferences (Phase 5 Step 13)
-- Ensures tenant isolation, RLS security, and delivery idempotency.
-- ==============================================================================

-- 1. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  security_enabled BOOLEAN NOT NULL DEFAULT true, -- Immutable security notice flag
  account_enabled BOOLEAN NOT NULL DEFAULT true,  -- Immutable account lifecycle flag
  tax_reports_enabled BOOLEAN NOT NULL DEFAULT true,
  calculations_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_usage_enabled BOOLEAN NOT NULL DEFAULT true,
  billing_enabled BOOLEAN NOT NULL DEFAULT true,
  professional_handoff_enabled BOOLEAN NOT NULL DEFAULT true,
  product_updates_enabled BOOLEAN NOT NULL DEFAULT false,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_preferences_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id
  ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their initial notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label TEXT,
  is_admin_only BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, read)
  WHERE read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own non-admin notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id AND is_admin_only = false);

CREATE POLICY "Users can mark their own notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id AND is_admin_only = false)
  WITH CHECK (auth.uid() = user_id AND is_admin_only = false);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id AND is_admin_only = false);

-- 3. NOTIFICATION DELIVERIES AUDIT LOG TABLE
-- CRITICAL PRIVACY: Never stores passwords, tokens, or raw tax calculations.
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT,
  recipient_sanitized TEXT NOT NULL,
  failure_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deliveries_user_id
  ON public.notification_deliveries(user_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_idempotency
  ON public.notification_deliveries(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Enable RLS on delivery audit logs: Only service role can access
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages notification deliveries"
  ON public.notification_deliveries
  FOR ALL
  USING (auth.role() = 'service_role');
