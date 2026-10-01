-- Migration: Stripe Webhook Event Idempotency Tracking
-- Date: 2026-10-01
-- Project: aitaxhelp (nknkrvpkfqdounzjjaon)
-- Note: Do NOT push until production deployment

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stripe_webhook_event_id UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_event_id ON public.stripe_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_processed_at ON public.stripe_webhook_events (processed_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access and insert webhook event idempotency records
CREATE POLICY "Service role full access to stripe webhook events"
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
