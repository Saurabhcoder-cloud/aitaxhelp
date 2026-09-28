# Production Data Management, Retention, Backup/Recovery & Disaster Recovery Controls

## 1. Architectural Overview

TaxAIHelp implements an audited, non-destructive data lifecycle, retention, backup-readiness, and disaster-recovery architecture.
The data architecture guarantees the protection of taxpayer financial figures, referential consistency across relational datasets, and transparency regarding backup and recovery capabilities.

### Mandatory Operational Disclosures
> [!IMPORTANT]
> **"Backup readiness is not the same as confirmed backup availability."**
> The platform distinguishes between an unconfigured backup architecture (`NOT_CONFIGURED`), a provider reporting degraded states, and a verified live backup. The platform never fabricates backup success or recovery timestamps.

> [!IMPORTANT]
> **"RPO/RTO values are operational targets unless measured by an actual configured recovery system."**
> Recovery Point Objective (RPO: 60 minutes) and Recovery Time Objective (RTO: 120 minutes) serve as system engineering targets, not guaranteed service levels, unless substantiated by empirical restore drills.

---

## 2. Centralized Dataset Inventory

The system inventories 16 core datasets across the platform:

| Dataset Key | Classification | Category | Retention Mode | Recovery Priority | User Export | User Deletion |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `USER_PROFILE` | `CONFIDENTIAL` | Identity | User Controlled | `HIGH` | Yes | Purge |
| `TAX_PROFILE` | `SENSITIVE_TAX` | Taxpayer Context | User Controlled | `CRITICAL` | Yes | Purge |
| `TAX_CALCULATIONS` | `SENSITIVE_TAX` | Calculations | User Controlled | `CRITICAL` | Yes | Purge |
| `AI_CONVERSATIONS` | `CONFIDENTIAL` | AI Assistance | User Controlled | `HIGH` | Yes | Purge |
| `TAX_REPORTS` | `SENSITIVE_TAX` | Reporting | User Controlled | `HIGH` | Yes | Purge |
| `PROFESSIONAL_LEADS`| `CONFIDENTIAL` | Handoff | Operational | `HIGH` | Yes | Anonymize |
| `SUBSCRIPTIONS` | `CONFIDENTIAL` | Billing | Operational | `CRITICAL` | Yes | Anonymize |
| `USAGE_RECORDS` | `INTERNAL` | Metering | Operational | `NORMAL` | Yes | Anonymize |
| `NOTIFICATIONS` | `INTERNAL` | Communications | User Controlled | `NORMAL` | Yes | Purge |
| `SUPPORT_TICKETS` | `CONFIDENTIAL` | Support | Operational | `HIGH` | Yes | Retain/Anonymize |
| `SUPPORT_MESSAGES`| `CONFIDENTIAL` | Support | Operational | `HIGH` | Yes (Public) | Retain/Anonymize |
| `AUDIT_LOGS` | `SECURITY_SENSITIVE`| Audit | Security | `CRITICAL` | No | Retain (Immutable)|
| `ADMIN_CONFIGURATION`| `SECURITY_SENSITIVE`| Control | Configuration | `HIGH` | No | Retain |
| `PLATFORM_CONFIGURATION`| `INTERNAL` | Control | Configuration | `HIGH` | No | Retain |
| `ANALYTICS` | `INTERNAL` | Observability | Operational | `LOW` | No | Purge |
| `OPERATIONAL_METRICS`| `INTERNAL`| Observability | Operational | `LOW` | No | Purge |

---

## 3. Data Classifications & Tax Data Protection

1. **`SENSITIVE_TAX`**:
   - Covers: Tax calculations, tax profiles, calculation input snapshots, report outputs, tax liability figures.
   - **Protection Invariant**: Prohibited from ever appearing in operational logs, metrics labels, health status responses, backup telemetry, or admin aggregate displays.
   - Prohibited fields include: `ssn`, `ein`, `wages`, `adjustedGrossIncome`, `taxableIncome`, `totalTaxLiability`, `refundAmount`, `bankRoutingNumber`, `bankAccountNumber`.
2. **`SECURITY_SENSITIVE`**:
   - Covers: Authentication tokens, password hashes, audit logs, admin access records.
   - Must never be exported to end users or included in error traces.
3. **`CONFIDENTIAL`**:
   - Covers: User profiles, AI chats, support tickets, professional leads.
   - Accessible only by the owning user or authorized admins with audit tracking.
4. **`INTERNAL`**:
   - Covers: Operational metrics, feature flags, anonymous usage counters.
5. **`PUBLIC`**:
   - Covers: Public marketing blogs, tax guides, general disclaimers.

---

## 4. Retention Policy Architecture & Legal Holds

### Retention Modes
- **`USER_CONTROLLED`**: Retained while account is active; purged upon explicit user account deletion request.
- **`OPERATIONAL`**: Retained for active operational or accounting workflows (e.g. 7 years for billing history).
- **`SECURITY` / `AUDIT`**: Retained immutably for compliance and security audit trails (e.g. 7 years).
- **`CONFIGURATION` / `SYSTEM`**: Retained across application lifecycles.
- **`policy_not_configured`**: Explicitly used where a legal retention period has not been established; never fabricates legal obligations.

### Legal & Security Holds
- Prevents automated or manual deletion of any tagged dataset or record.
- Managed via `LegalHoldService`.
- Requires administrative authorization, record identifier, and documented business justification.
- Emits immutable audit logs: `legal_hold_created` and `legal_hold_removed`.
- Retention cleanups strictly skip any record under an active legal hold.

---

## 5. Account Deletion & Export Integration

### Deletion Planning (`AccountDataService` & `RetentionPolicyService`)
Account deletion executes an audited plan that cleanly differentiates actions:
- **`PURGE`**: Complete hard deletion of user-owned records (tax profiles, calculations, conversations, reports, notifications).
- **`ANONYMIZE`**: Strips PII and disassociates identity while maintaining financial accounting totals (subscriptions, usage records).
- **`RETAIN`**: Preserved for audit integrity (immutable security audit logs).

### User Data Export
- Includes: User profile, tax calculations, reports, AI conversations, support tickets, public ticket messages, notifications.
- Excludes: Administrative internal notes, service credentials, other users' data, raw audit logs.

---

## 6. Backup Provider Abstraction & Restore Verification

### Backup Provider Interface
- Provider-neutral contract (`BackupProvider`): `getStatus()`, `getLastSuccessfulBackup()`, `getBackupHealth()`, `verifyBackup()`, `getRecoveryPoint()`.
- **Default State**: `NullBackupProvider`.
  - Honestly reports: `status: "NOT_CONFIGURED"`, `configured: false`, `recoveryPoint: null`.
  - Invariant: Will **never** report `HEALTHY` or fabricate timestamps unless a real provider confirms it.

### Restore Verification
- Managed by `RestoreVerificationService`.
- Performs simulated non-destructive recovery drills without impacting live production data.
- Records verification history, duration, and checked datasets with zero database alterations.

---

## 7. Data Integrity, Orphan & Duplicate Detection

### Integrity Service (`DataIntegrityService`)
Runs 11 non-destructive diagnostic checks:
1. `orphaned_user_reference` (Tax calculations)
2. `orphaned_user_reference` (Tax profiles)
3. `orphaned_user_reference` (AI conversations)
4. `orphaned_calculation_reference` (Tax reports)
5. `orphaned_user_reference` (Tax reports)
6. `orphaned_user_reference` (Professional leads)
7. `orphaned_user_reference` (Notifications)
8. `orphaned_user_reference` (Support tickets)
9. `orphaned_ticket_reference` (Support messages)
10. `orphaned_user_reference` (Subscriptions)
11. `duplicate_ticket_number` (Support system)

**Invariant**: Integrity checks inspect referential integrity and counts only. They never read or output sensitive financial numbers.

---

## 8. Safe Administrative Controls

- **No "Delete All" Button**: Bulk destructive actions from the admin UI are forbidden.
- **Dry-Run Enforcement**: All retention cleanups default to dry-run mode (`previewRetentionCleanup`) returning counts without mutations.
- **Explicit Confirmation**: Controlled execution requires `{ confirm: true }`, checks policy age, and respects legal holds.
- **Audit Logging**: Every health check, integrity run, retention preview, backup verification, and legal hold action is recorded in `AuditLogStore`.
