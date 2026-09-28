# TaxAIHelp Production Deployment Runbook

## Standard Operating Procedure: Application Deployment

This runbook outlines the 9-stage sequence for executing a zero-downtime, production-grade release of TaxAIHelp.

---

### Stage 1: Pre-Deployment Readiness Check
1. Ensure the release branch (e.g. `main`) has successfully completed the GitHub Actions CI pipeline:
   - Typecheck, ESLint, Vitest test suite (660+ tests), and Next.js production build.
2. Confirm there are no unreviewed schema changes or destructive SQL patterns in `supabase/migrations/`.
3. Verify that the previous release version tag is recorded for rapid rollback capability.

---

### Stage 2: Environment Variable & Secrets Verification
1. Access the hosting environment (Vercel / AWS ECS / Cloudflare).
2. Validate environment completeness using the diagnostic endpoint:
   ```bash
   curl -s -H "Authorization: Bearer $ADMIN_TOKEN" https://taxaihelp.com/api/v1/admin/deployment/readiness | jq .
   ```
3. Verify that:
   - `APP_ENV=production`
   - `NEXT_PUBLIC_APP_URL` uses `https://taxaihelp.com`
   - All required secrets are present in server environment variables without `NEXT_PUBLIC_` prefixes.

---

### Stage 3: Database Migration Application
1. Trigger a database backup or snapshot in the database provider console.
2. Apply pending migrations sequentially:
   ```bash
   supabase db push --db-url "$PRODUCTION_DATABASE_URL"
   ```
3. Confirm all 8 migrations are registered and RLS is enabled on new tables.
4. **Safety Rule**: If a migration fails, STOP deployment immediately. Do NOT run automated reverse scripts. Follow `docs/DATABASE-MIGRATION-RUNBOOK.md`.

---

### Stage 4: Application Container / Server Deployment
1. Initiate production build and deployment through the CI/CD pipeline or hosting platform.
2. Next.js creates immutable build artifacts using dynamic route caching and optimized static assets.
3. Keep the previous application release active until new containers pass health checks.

---

### Stage 5: Smoke Checks
Perform manual and automated smoke checks on critical paths:
1. **Public Marketing & SEO**:
   - `GET /` -> HTTP 200 OK
   - `GET /sitemap.xml` -> Valid XML
   - `GET /robots.txt` -> Disallows `/dashboard` and `/admin`
2. **Deterministic Calculators**:
   - Calculate Federal Income Tax for Single filer ($75,000 W-2) -> Verify deterministic math without AI dependency.
3. **Authentication Gateway**:
   - Test login / session endpoint with test user -> Verify `taxaihelp-auth-token` cookie has `Secure`, `HttpOnly`, `SameSite=lax`.
4. **Admin Dashboard**:
   - Access `/admin/deployment` -> Confirm `overallStatus` is `READY` or `READY_WITH_WARNINGS`.

---

### Stage 6: Health Endpoint Verification
Query the live observability endpoints:
1. **Liveness Check**:
   ```bash
   curl -s https://taxaihelp.com/api/health
   # Expected: {"status":"ok","platform":"TaxAIHelp","checks":{"app":"ok","database":"ok"}}
   ```
2. **Readiness Check**:
   ```bash
   curl -s https://taxaihelp.com/api/health/readiness
   # Expected: {"status":"ready", ...}
   ```
3. Inspect `/admin/system-health` for error rate spikes or elevated latency.

---

### Stage 7: Rollback Decision Window
1. Establish a 15-minute monitoring observation window immediately following traffic routing.
2. If any of the following occur, trigger an immediate rollback:
   - Elevated HTTP 500 error rates exceeding 1% of total traffic.
   - Core deterministic tax calculations returning `TAX_ENGINE_ERROR`.
   - Authentication gateway failures preventing user logins.
3. Proceed according to `docs/ROLLBACK-RUNBOOK.md`.

---

### Stage 8: Incident Handling During Deployment
1. If an incident is triggered, execute the 5-phase incident protocol:
   - **Detection**: Note correlation `requestId` and error classification.
   - **Containment**: Route traffic away from degraded components or toggle feature flags in `/admin/configuration`.
   - **Recovery**: Apply emergency configuration reset or container rollback.
   - **Verification**: Re-run `/api/v1/admin/deployment/readiness`.
   - **Post-Incident Review**: Document timeline and root cause in incident log.

---

### Stage 9: Post-Deployment Verification & Audit
1. Log successful deployment event in `AuditLogStore`:
   - Action: `deployment:deployment_completed`
   - Resource: Release version tag (e.g. `v0.1.0`)
2. Notify team in deployment communication channels.
3. Tag the Git commit in the repository with the release version.
