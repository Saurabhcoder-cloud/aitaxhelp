-- Phase 5 Step 19: Production Operations, Incident Management & Monitoring
-- Migration: 20260925_operations_incidents.sql

CREATE TABLE IF NOT EXISTS public.operations_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('SEV1', 'SEV2', 'SEV3', 'SEV4')),
  status TEXT NOT NULL CHECK (status IN ('DETECTED', 'INVESTIGATING', 'IDENTIFIED', 'MITIGATING', 'MONITORING', 'RESOLVED', 'CLOSED')),
  service TEXT NOT NULL,
  summary TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  identified_at TIMESTAMPTZ,
  mitigated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  root_cause TEXT,
  resolution_summary TEXT,
  customer_impact TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operations_incident_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.operations_incidents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  event_type TEXT NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.operations_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL UNIQUE,
  service TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('SEV1', 'SEV2', 'SEV3', 'SEV4', 'WARNING', 'INFO')),
  condition TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  count INT NOT NULL DEFAULT 1,
  measurement_window TEXT NOT NULL DEFAULT '5m',
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and bounded operational querying
CREATE INDEX IF NOT EXISTS idx_operations_incidents_status ON public.operations_incidents(status);
CREATE INDEX IF NOT EXISTS idx_operations_incidents_severity ON public.operations_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_operations_incidents_service ON public.operations_incidents(service);
CREATE INDEX IF NOT EXISTS idx_operations_incidents_detected_at ON public.operations_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_incident_events_incident_id ON public.operations_incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_operations_alerts_status ON public.operations_alerts(status);
CREATE INDEX IF NOT EXISTS idx_operations_alerts_service ON public.operations_alerts(service);

-- Enable Row Level Security (RLS)
ALTER TABLE public.operations_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_alerts ENABLE ROW LEVEL SECURITY;

-- Restrict to authenticated administrators and service_role
CREATE POLICY "Admins full access on operations_incidents"
  ON public.operations_incidents
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins full access on operations_incident_events"
  ON public.operations_incident_events
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins full access on operations_alerts"
  ON public.operations_alerts
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );
