# TaxAIHelp Production Architecture Manifest

## 1. System Topology Overview

TaxAIHelp is an enterprise-grade US taxpayer assistance and calculation platform built on Next.js, deterministic statutory tax rules, and AI guidance.

```
                         ┌────────────────────────────────┐
                         │   Cloudflare CDN / WAF / DNS   │
                         │    (HSTS, TLS 1.3, Rate Limit) │
                         └───────────────┬────────────────┘
                                         │
                                         ▼
                         ┌────────────────────────────────┐
                         │     Next.js Application Host   │
                         │   (Edge Routing, App Router)   │
                         └───────┬───────────────┬────────┘
                                 │               │
                 ┌───────────────┘               └───────────────┐
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     Public Web & Client UI      │             │    Server Handlers & Core API   │
│  - Static Marketing & SEO Hub   │             │  - Deterministic Tax Engine     │
│  - Interactive 1040 Calculators │             │  - Session Auth & RLS Gateway   │
│  - Taxpayer Secure Dashboard    │             │  - Admin Operations & Auditing  │
│  - Customer Support Center      │             │  - Request ID Tracing / Metrics │
└─────────────────────────────────┘             └───────┬─────────┬─────────┬─────┘
                                                        │         │         │
                 ┌──────────────────────────────────────┘         │         └──────────────────────────────────┐
                 ▼                                                ▼                                            ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│       Supabase (PostgreSQL)     │             │       External Integrations     │         │      Data Lifecycle & Recovery  │
│  - 9 Migrations, RLS Enforced   │             │  - Google Gemini 1.5 Flash (AI) │         │  - Backup Provider Abstraction  │
│  - Tax Calculations & Profiles  │             │  - Stripe Payments (Billing)    │         │  - Restore Verification Drills  │
│  - Subscriptions, Tickets, Logs │             │  - Transactional Email (Resend) │         │  - Legal Holds & Retention Engine│
└─────────────────────────────────┘             └─────────────────────────────────┘         └─────────────────────────────────┘
```

---

## 2. Component Inventory & Operational Classification

| Subsystem Component | Role & Scope | Requirement Status | Degraded Fallback Mode |
| :--- | :--- | :--- | :--- |
| **Next.js App Server** | Web framework & API host | **MANDATORY** | None (Core process must be alive) |
| **Deterministic Tax Engine** | Federal 1040 / Schedule C math | **MANDATORY** | 100% self-contained; 0 external dependencies |
| **Supabase Database** | Persistent relational storage | **MANDATORY (Prod)** | Local in-memory store in dev/staging |
| **Google Gemini AI** | Conversational tax explanations | **FEATURE-DEPENDENT** | Explains math is verified; AI disabled gracefully |
| **Stripe Payments** | Subscription checkouts | **FEATURE-DEPENDENT** | Staging checkout simulator; billing disabled gracefully |
| **Transactional Email** | Password reset & ticket notifications | **FEATURE-DEPENDENT** | In-app notification center is authoritative |
| **Backup Provider** | Continuous recovery snapshots | **FEATURE-DEPENDENT** | Honestly reports `NOT_CONFIGURED` until active |
| **Observability Subsystem** | Request IDs, metrics, errors | **MANDATORY** | Structured logger & in-memory sliding windows |
| **Admin Operations Portal** | Deployment, config, data health | **MANDATORY** | Restricted strictly to authenticated admins |
| **CI/CD Pipeline** | GitHub Actions build & test | **MANDATORY** | Fails fast on typecheck, lint, or test failures |

---

## 3. Component Invariants

### 3.1 Deterministic Tax Engine
- **Non-Negotiable Rule**: Numerical tax calculations are strictly deterministic. The platform **NEVER** relies on Gemini or an LLM for tax calculation math or statutory deductions.
- Operates identically offline, in local development, or in cloud production.

### 3.2 Backup Honesty
- The backup subsystem never fabricates status or recovery timestamps.
- If no cloud backup provider is provisioned, the system honestly reports status `NOT_CONFIGURED` and recovery point `null`.

### 3.3 Security & Least Privilege
- Administrative roles (`super_admin`, `admin`, `compliance_officer`, `support_specialist`) follow the principle of least privilege.
- Secret credentials are strictly isolated to server-side memory and never serialized to client browsers.

---

## 4. Operational Monitoring & Incident Management Architecture

### 4.1 Service Catalog & Health Aggregation
- 18 enumerated services in `lib/operations/service-catalog.ts` with DAG dependencies in `lib/operations/dependencies.ts`.
- Statuses: `HEALTHY`, `DEGRADED`, `PARTIAL_OUTAGE`, `MAJOR_OUTAGE`, `MAINTENANCE`, `UNKNOWN`, `NOT_CONFIGURED`, `NO_DATA`.
- Measurement states strictly preserve honesty: `MEASURED`, `UNMEASURED`, `NOT_CONFIGURED`, `NO_DATA`. Target latency is never presented as actual latency.

### 4.2 Incident Management Subsystem
- Authoritative database store: `operations_incidents` & `operations_incident_events` tables with RLS and audit trails.
- Incident IDs follow `INC-YYYY-NNNNNN` format.
- Lifecycle: `DETECTED` -> `INVESTIGATING` -> `IDENTIFIED` -> `MITIGATING` -> `MONITORING` -> `RESOLVED` -> `CLOSED`.
- Internal incident notes and administrative actions are isolated from public status communication.

### 4.3 Operational Alerts & Security Signals
- Alert states: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `SUPPRESSED`.
- Configurable operational defaults for 5xx rates, p95 latency, webhook failures, and tax engine exceptions.
- Security anomaly detection records `SECURITY_SIGNAL` events without premature profiling or attack claims.

### 4.4 Final Launch Readiness Engine
- 16 audited operational categories evaluated in `lib/operations/launch-readiness.ts`.
- Gating statuses: `READY`, `READY_WITH_WARNINGS`, `BLOCKED`, `NOT_READY`.
- Launch dashboard at `/admin/launch-readiness` provides pre-flight release verification.

