# TaxAIHelp Database Migration Runbook & Safety Architecture

## 1. Core Principles

Database migrations for TaxAIHelp follow strict zero-downtime, forward-compatible engineering principles:
1. **Forward Migrations Only**: Database migrations are strictly forward-applied. Automatic or automated rollback of production schema is prohibited due to the risk of catastrophic data loss.
2. **Backward-Compatible Expansions**: Schema changes must be backward-compatible with active application code. Deploy additive changes first (new tables, nullable columns), deploy new application code, backfill data, and only deprecate old structures in subsequent releases.
3. **No Destructive Keywords**: Production migrations must not include `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or unconstrained `CASCADE` operations without explicit operational change approval.
4. **Mandatory Row Level Security (RLS)**: Every new table storing user, calculation, billing, or audit data MUST enable RLS and declare explicit policies.

---

## 2. Migration Inventory & Ordering

Migrations under `supabase/migrations/` must follow the timestamp naming convention `YYYYMMDD_<name>.sql` and be applied sequentially:

| Sequence | Migration File | Target Subsystem | RLS Enforced | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `20260925_tax_calculations.sql` | Tax Engine | Yes | Primary storage for deterministic calculations and taxpayer profiles. |
| 2 | `20260925_professional_leads.sql` | Professional Network | Yes | Storage and status tracking for CPA/EA consultation leads. |
| 3 | `20260925_subscriptions_and_usage.sql` | Monetization & Quotas | Yes | Stripe subscription synchronization and AI usage quota metering. |
| 4 | `20260925_admin_audit_and_roles.sql` | Security & Governance | Yes | Immutable system audit log and role-based administrative access. |
| 5 | `20260925_notifications_and_preferences.sql` | Communications | Yes | In-app notifications and user preference matrix. |
| 6 | `20260925_platform_configuration.sql` | Operations Control | Yes | Centralized platform configuration and feature flag persistence. |
| 7 | `20260925_support_center.sql` | Customer Support | Yes | Support tickets, threaded messages, internal notes, and feedback. |
| 8 | `20260925_data_management.sql` | DR & Retention | Yes | Retention policies, legal holds, data health runs, restore drill records. |
| 9 | `20260925_operations_incidents.sql` | Operational Monitoring | Yes | Incidents, timeline events, and operational alerts tracking. |

---

## 3. Step-by-Step Migration Execution Procedure

### Step 3.1: Pre-Migration Review & Diagnostics
Before any migration is approved for staging or production:
1. Run automated migration readiness checks via `lib/deployment/migration-readiness.ts`.
2. Inspect for destructive keywords:
   ```bash
   grep -Ei "DROP TABLE|DROP COLUMN|TRUNCATE|CASCADE" supabase/migrations/*.sql
   ```
3. Verify that every `CREATE TABLE` is paired with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
4. Ensure primary keys use UUIDs and all foreign key references define appropriate indexed lookups.

### Step 3.2: Staging Application
1. Apply migrations to the staging Supabase project:
   ```bash
   supabase db push --db-url "$STAGING_DATABASE_URL"
   ```
2. Run diagnostic queries to verify tables and indexes:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   ```
3. Execute end-to-end integration tests in the staging environment.

### Step 3.3: Production Execution
1. Verify database backup status in `/admin/data-health` before initiating schema changes.
2. If major schema modifications are required, temporarily enable maintenance mode via `/admin/configuration` (`platform.maintenance_mode = true`).
3. Apply migrations to production Supabase database:
   ```bash
   supabase db push --db-url "$PRODUCTION_DATABASE_URL"
   ```
4. Verify table accessibility and RLS policies via `/api/v1/admin/deployment/readiness`.
5. Disable maintenance mode once application health is verified.

---

## 4. Rollback & Forward-Fix Strategy

> [!CAUTION]
> **NEVER ATTEMPT AUTOMATIC DATABASE ROLLBACKS.**
> Reversing a database migration via `DROP` statements destroys all user data created since migration application.

If an applied migration causes application errors:
1. **Application Rollback**: Revert application server containers to the previous stable release. Because all schema changes are backward-compatible, older application code will continue functioning safely.
2. **Forward-Fix Migration**: Create a new, forward-applied migration file (e.g. `YYYYMMDD_fix_<issue>.sql`) resolving the schema error or relaxing a problematic constraint.
3. **Data Repair**: For data integrity anomalies, execute non-destructive diagnostic repair scripts with explicit administrative confirmation and audit tracking.
