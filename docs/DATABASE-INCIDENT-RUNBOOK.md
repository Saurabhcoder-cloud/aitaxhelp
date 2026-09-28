# Database & Backup Incident Runbook

## Overview
PostgreSQL (hosted via Supabase) serves as the persistent store for user accounts, profiles, saved tax calculations, audit logs, and operational telemetry. Data integrity, strict Row Level Security (RLS), and backup durability are non-negotiable.

**Criticality:** `CRITICAL`  
**Core Impact:** YES — Directly affects user login, saving calculations, viewing reports, and administrative auditing.

---

## 1. Incident Triggers & Classification
| Trigger | Severity | Action |
| :--- | :--- | :--- |
| Database connection refusal / complete outage | **SEV1** | Halt write traffic, engage Supabase support, inspect pool exhaustion. |
| Connection pool saturation (> 90% pool utilization) | **SEV2** | Scale connection pooler (PgBouncer), investigate query leak or unindexed scans. |
| RLS policy violation / permission breach | **SEV1** | Immediately isolate affected table, revert migration or revoke offending grant. |
| Automated backup failure / snapshot unavailable | **SEV2** | Assess RPO exposure, trigger manual snapshot via Supabase API, inspect storage quota. |
| Slow query / elevated transaction latency (> 1000ms p95) | **SEV3** | Identify blocking locks or sequential scans via pg_stat_activity. |

---

## 2. Emergency Operational Policy: Data Integrity First
> [!CAUTION]
> If database connectivity is degraded or unstable:
> 1. **STOP UNSAFE WRITE OPERATIONS:** Do not queue writes in volatile memory where loss can occur.
> 2. **NEVER BYPASS ROW LEVEL SECURITY:** Under no circumstances should service-role tokens or elevated permissions be given to public endpoints to "work around" an RLS issue.
> 3. **HONEST BACKUP REPORTING:** Never mark backup health as `HEALTHY` if a scheduled snapshot fails. Return `DEGRADED` or `FAILED`.

---

## 3. Database Outage Response Procedure

### Phase 1: Detection & Confirmation
1. **Alert Receipt:** Check for `DATABASE_UNAVAILABLE` or `DATABASE_LATENCY_SPIKE` in `/admin/operations/alerts`.
2. **Health Probe Verification:** Inspect `ServiceHealthService.checkServiceHealth('DATABASE')`.
3. **Provider Status:** Check status.supabase.com and AWS region status.

### Phase 2: Immediate Containment
1. **Enable Maintenance Mode:** If database errors impact > 25% of requests, enable Maintenance Mode via `/admin/operations` to protect taxpayer state and prevent incomplete transactions.
2. **Inspect Connection Pooler:** Verify whether PgBouncer connections are maxed out due to leaked client instances or long-running transactions.
3. **Review Recent Migrations:** Check recent schema deployments (`supabase/migrations/`) to identify syntax errors, lock contentions, or unindexed foreign keys.

### Phase 3: Recovery & Verification
1. **Terminate Stalled Queries:** Identify and terminate hanging transactions via Supabase management console.
2. **Verify RLS Integrity:** Ensure all tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` intact.
3. **Verify Read-After-Write:** Execute smoke tests on `/api/v1/auth` and `/api/v1/tax/calculations`.
4. **Disable Maintenance Mode:** Once health checks consistently report `HEALTHY` for 5 consecutive minutes, restore standard traffic.

---

## 4. Backup & Recovery Incident Procedure

### When Backup Fails or Provider Reports Errors:
1. **Do NOT Claim Healthy Backup:** Mark `BACKUP` service status as `DEGRADED` in the operational catalog.
2. **Assess RPO Exposure:** Calculate the time elapsed since the last confirmed backup point. If > 24 hours, escalate to **SEV2**.
3. **Inspect Provider Quota & Permissions:** Verify Supabase storage limits and IAM permissions for off-site replica buckets.
4. **Trigger Manual Snapshot:** Attempt an ad-hoc snapshot using Supabase CLI / API.
5. **Calculator Independence:** Notice that tax calculators and client-side deterministic functions do **NOT** fail merely because backup monitoring is degraded. Calculators remain fully available for unpersisted computations.
6. **Document in Runbook:** Record backup failure reason, mitigation steps, and verified restoration test timestamp in `/admin/operations/incidents`.
