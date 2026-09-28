# TaxAIHelp Rollback Runbook & Recovery Procedures

## 1. Rollback Architecture & Decision Hierarchy

When a production incident occurs post-deployment, mitigation must follow the safest path with minimal risk of secondary data corruption.
The operational hierarchy of recovery is:

```
Level 1: Feature Flag Rollback (Safest - Seconds, Zero Downtime)
       │
       ▼
Level 2: Configuration Reset (Fast - Seconds, In-Memory / Cached)
       │
       ▼
Level 3: Application Container Rollback (Safe - Minutes, No Schema Mutations)
       │
       ▼
Level 4: Forward-Fix Database Migration (Controlled - Minutes, Preserves Data)
       │
       ▼
Level 5: Point-In-Time Database Restore (LAST RESORT - Disaster Recovery Only)
```

---

## 2. Level 1: Feature Flag Rollback

If a failure is isolated to a specific platform feature (e.g. AI assistant, Stripe billing, support ticket submission):
1. Navigate to `/admin/configuration`.
2. Toggle the offending feature flag to **OFF**:
   - `ai.assistant_enabled = false`
   - `billing.enabled = false`
   - `support.user_ticket_creation_enabled = false`
3. The platform instantly falls back to degraded mode without requiring a code re-deployment.
4. Core deterministic calculators, static pages, and existing account history continue running normally.

---

## 3. Level 2: Configuration Rollback

If an administrative configuration mistake was saved to the platform config store:
1. Revert the problematic key to its default state using `/admin/configuration`.
2. `PlatformConfigStore` automatically falls back to hardcoded, production-safe in-memory defaults if persistence fails.
3. Every configuration change is recorded in `AuditLogStore` (`admin:config_updated`) with `previousValue` and `newValue` for traceability.

---

## 4. Level 3: Application Container Rollback

If a code defect, bundling bug, or runtime exception affects the new release:
1. In hosting console (Vercel / AWS ECS / Cloudflare Pages):
   - Select the previous stable deployment ID.
   - Click **Instant Rollback** or re-point traffic to the previous deployment SHA.
2. Because database migrations are strictly forward-compatible and additive, the previous application version will continue operating seamlessly against the current database schema.
3. Verify recovery via `GET /api/health` and `/admin/system-health`.

---

## 5. Level 4: Database Forward-Fix Strategy

> [!CAUTION]
> **DO NOT EXECUTE AUTOMATED REVERSE DATABASE SCRIPTS.**
> Dropping tables or columns will erase user data created during the deployment window.

If a database migration caused performance degradation or constraint conflicts:
1. **Analyze Root Cause**: Inspect locking behavior or missing indexes in database metrics.
2. **Author Forward-Fix Migration**: Create a new migration file resolving the constraint or adding the missing index (e.g. `20260925_fix_<issue>.sql`).
3. **Apply Forward**: Apply the forward-fix via `supabase db push`.

---

## 6. Level 5: Point-In-Time Database Restore (Disaster Recovery)

Only applicable in catastrophic database corruption or total cluster outage:
1. Coordinate with Database Lead and Security Officer.
2. Locate the most recent confirmed recovery point preceding the corruption event.
3. Execute point-in-time recovery into an isolated staging instance first to verify schema and data integrity.
4. Re-point connection strings once data integrity is confirmed.
5. Notify affected account holders in accordance with `docs/SECURITY-PRIVACY-ARCHITECTURE.md`.
