export type AdminRole = "super_admin" | "admin" | "compliance_officer" | "support_specialist";

export type AdminPermission =
  | "leads:read"
  | "leads:write"
  | "users:read"
  | "users:write"
  | "calculations:read"
  | "reports:read"
  | "ai:analytics"
  | "billing:read"
  | "system:audit_logs"
  | "system:manage_admins"
  | "system:configuration";

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "leads:read",
    "leads:write",
    "users:read",
    "users:write",
    "calculations:read",
    "reports:read",
    "ai:analytics",
    "billing:read",
    "system:audit_logs",
    "system:manage_admins",
    "system:configuration",
  ],
  admin: [
    "leads:read",
    "leads:write",
    "users:read",
    "users:write",
    "calculations:read",
    "reports:read",
    "ai:analytics",
    "billing:read",
    "system:audit_logs",
    "system:configuration",
  ],
  compliance_officer: [
    "leads:read",
    "users:read",
    "calculations:read",
    "reports:read",
    "system:audit_logs",
  ],
  support_specialist: [
    "leads:read",
    "users:read",
    "calculations:read",
  ],
};
