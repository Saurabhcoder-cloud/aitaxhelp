# TaxAIHelp Platform Configuration & Feature Flag Architecture

This document describes the centralized configuration, feature flag, maintenance mode, and operational controls system for TaxAIHelp.

---

## 1. Architectural Philosophy

1. **Server Authority**: Privileged configurations and feature flags are strictly resolved and enforced on the server. Client-side flags, URL parameters, or local storage values are never trusted.
2. **Admin-Only Mutation**: Only authenticated administrators passing `requireAdmin()` may read sensitive configurations or mutate any configuration item.
3. **Deterministic Tax Engine Immutability**:
   > **Tax rules and tax-engine behavior are source-controlled and cannot be modified through the platform configuration system.**
   Standard deductions, tax brackets, FICA wage caps, self-employment formulas, and calculation algorithms remain source-controlled, versioned, tested, and immutable at runtime.
4. **Credential Isolation**: Secrets (e.g. `GEMINI_API_KEY`, Supabase service keys, Stripe webhook secrets, SMTP passwords) are **NEVER** stored in the configuration table or audit logs.
5. **Safe Defaults & Fail-Safe Operation**: If the configuration store is uninitialized, partially migrated, or temporarily unreachable, the system automatically falls back to secure, hardcoded in-memory defaults.

---

## 2. Configuration Domains & Allowlisted Keys

TaxAIHelp defines 31 explicitly typed and allowlisted configuration keys across 12 operational categories:

| Category | Key | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PLATFORM** | `platform.name` | String | `"TaxAIHelp"` | Public-facing brand name |
| | `platform.maintenance_mode` | Boolean | `false` | Global maintenance lockdown |
| | `platform.maintenance_message` | String | `"TaxAIHelp is undergoing scheduled maintenance..."` | Public maintenance explanation |
| | `platform.maintenance_banner_enabled` | Boolean | `false` | Displays top maintenance announcement banner |
| | `platform.announcement_enabled` | Boolean | `false` | Displays global notification announcement |
| | `platform.announcement_message` | String | `""` | Safe announcement text (max 500 chars) |
| | `platform.announcement_type` | Enum | `"info"` | Announcement style (`info`, `warning`, `maintenance`) |
| **AUTH** | `auth.registration_enabled` | Boolean | `true` | Allows new taxpayer signups |
| | `auth.new_user_signup_enabled` | Boolean | `true` | Controls new registration flow |
| | `auth.password_reset_enabled` | Boolean | `true` | Controls password recovery requests |
| **CALCULATORS** | `calculators.federal_income_enabled` | Boolean | `true` | Enables Federal Income Tax Calculator |
| | `calculators.self_employed_enabled` | Boolean | `true` | Enables Self-Employed Calculator |
| | `calculators.tax_1099_enabled` | Boolean | `true` | Enables 1099 Contractor Calculator |
| | `calculators.quarterly_enabled` | Boolean | `true` | Enables Form 1040-ES Quarterly Calculator |
| **AI** | `ai.assistant_enabled` | Boolean | `true` | Enables AI Tax Assistant chat generation |
| | `ai.daily_limit_enforcement_enabled` | Boolean | `true` | Enforces message quota limits (10 free / 100 premium) |
| **REPORTS** | `reports.basic_enabled` | Boolean | `true` | Enables basic tax report generation |
| | `reports.premium_enabled` | Boolean | `true` | Enables comprehensive premium tax reports |
| **PROFESSIONALS** | `professionals.handoff_enabled` | Boolean | `true` | Enables CPA/EA lead handoff submissions |
| | `professionals.leads_enabled` | Boolean | `true` | Controls admin lead intake pipeline |
| **NOTIFICATIONS** | `notifications.in_app_enabled` | Boolean | `true` | Enables in-app notification center |
| | `notifications.email_enabled` | Boolean | `true` | Enables transactional email dispatch |
| **BILLING** | `billing.enabled` | Boolean | `true` | Enables billing and subscription features |
| | `billing.premium_checkout_enabled` | Boolean | `true` | Enables checkout sessions for premium tiers |
| **ACQUISITION** | `acquisition.public_blog_enabled` | Boolean | `true` | Enables public blog index and articles |
| | `acquisition.public_tax_guides_enabled` | Boolean | `true` | Enables public tax guides library |
| | `acquisition.public_pricing_enabled` | Boolean | `true` | Enables public pricing comparison page |
| | `acquisition.analytics_enabled` | Boolean | `true` | Enables anonymous acquisition analytics |
| **SECURITY** | `security.login_rate_limit_enabled` | Boolean | `true` | Enforces brute-force login rate limiting |
| | `security.ai_rate_limit_enabled` | Boolean | `true` | Enforces sliding-window AI prompt rate limiting |
| | `security.recovery_rate_limit_enabled` | Boolean | `true` | Enforces rate limits on password recovery requests |

---

## 3. Public vs. Private Configuration Boundary

To guarantee zero exposure of internal system thresholds or admin controls:

- **Public Endpoint (`GET /api/v1/config/public`)**:
  - Exposes strictly non-sensitive, public-facing flags:
    - `publicBlogEnabled`
    - `publicTaxGuidesEnabled`
    - `publicPricingEnabled`
    - `maintenanceMode`
    - `maintenanceBannerEnabled`
    - `announcementEnabled`
    - `announcementMessage` (safely escaped, no HTML)
    - `announcementType`
- **Admin Endpoint (`GET /api/v1/admin/config`)**:
  - Requires active admin authentication (`requireAdmin()`).
  - Returns complete configuration metadata (category, description, version, updatedBy, updatedAt).

---

## 4. Feature Flag Evaluation (`FeatureFlags` Service)

The `FeatureFlags` service provides server-authoritative methods:

```ts
import { FeatureFlags } from "@/lib/services/feature-flags";

// Check if a feature is enabled
const isAiActive = await FeatureFlags.isAiAssistantEnabled();

// Assert that a feature is enabled; throws AppError(403) if disabled
await FeatureFlags.require("billing.premium_checkout_enabled", "Premium Checkout");
```

### Integration Behavior When Flags Are Disabled:
- **AI Assistant**: Reject new `/api/v1/ai/assistant` requests. Saved conversation records remain intact.
- **Registration**: Reject `/api/v1/auth/session` signup requests. Existing users can log in, access history, export data, and delete accounts.
- **Billing Checkout**: Reject new checkout sessions. Existing subscriptions and entitlements are preserved.
- **Professional Handoff**: Reject new CPA lead submissions. Existing leads remain viewable by admins.
- **Reports**: Reject premium generation requests. Existing reports remain available.

---

## 5. Maintenance Mode Architecture (`MaintenanceService`)

When `platform.maintenance_mode` is enabled:
- Public end-user requests are diverted to a clean, user-facing maintenance notice.
- **Safe Bypasses:**
  - Health checks (`/api/health` and `/api/health/readiness`) remain active.
  - Authorized administrators retain full access to `/admin/*` and administrative APIs.
  - Diagnostic endpoints remain functional.

---

## 6. Concurrency Control & Versioning

- Every configuration record includes an integer `version` incremented monotonically on each mutation.
- When saving changes, the client submits an `expectedVersion`.
- If `expectedVersion` does not match the database version, the update is rejected with `CONFIGURATION_CONFLICT_ERROR` (HTTP 409).
- Stale admin browser tabs cannot accidentally overwrite newer administrative changes.

---

## 7. Audit Trail Integration

Every configuration update generates an audit entry in `AuditLogStore`:
- **Action**: `admin:config_updated`
- **Fields**: `adminUserId`, `requestId`, `configKey`, `previousValue`, `newValue`, `timestamp`.
- **Sanitization Invariant**: Sensitive fields are audited as `value_changed: true` rather than raw values.
- **Privacy Non-Negotiable**: No taxpayer numbers, financial amounts, or authentication credentials are ever logged.

---

## 8. What Configuration Can NEVER Control

1. **Tax Rules & Calculations**: Tax brackets, standard deductions, phase-out thresholds, and formulas are immutable in code.
2. **Authentication Entitlements**: Toggling billing flags never automatically grants or revokes taxpayer entitlements.
3. **Core Security Protections**: Essential CSRF, session validation, and tenant isolation policies cannot be disabled by admin toggles.
4. **Third-Party API Secrets**: Configuration records cannot store or modify server environment secrets.
