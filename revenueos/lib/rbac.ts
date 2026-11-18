import { isStaffRole } from "./env";

export type AdminSection =
  | "overview"
  | "products"
  | "subscriptions"
  | "audits"
  | "services"
  | "customers"
  | "quotations"
  | "payments"
  | "invoices"
  | "stripe"
  | "pricing"
  | "partners"
  | "analytics"
  | "settings"
  | "audit-logs";

export type AdminApiResource =
  | "config"
  | "prices"
  | "products"
  | "quotations-status"
  | "refunds"
  | "revenue"
  | "stripe-sync";

const ALL_STAFF = ["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN", "SALES_ADMIN", "SALES_USER"] as const;
const FINANCE_STAFF = ["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"] as const;
const COMMERCIAL_STAFF = ["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN", "SALES_ADMIN", "SALES_USER"] as const;
const OPS_STAFF = ["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN", "SALES_ADMIN"] as const;
const OWNER_STAFF = ["SUPER_ADMIN", "FOUNDER"] as const;

export const ADMIN_SECTION_ROLE_MATRIX: Record<AdminSection, readonly string[]> = {
  overview: OPS_STAFF,
  products: COMMERCIAL_STAFF,
  subscriptions: OPS_STAFF,
  audits: OPS_STAFF,
  services: COMMERCIAL_STAFF,
  customers: COMMERCIAL_STAFF,
  quotations: COMMERCIAL_STAFF,
  payments: FINANCE_STAFF,
  invoices: FINANCE_STAFF,
  stripe: OWNER_STAFF,
  pricing: FINANCE_STAFF,
  partners: OPS_STAFF,
  analytics: FINANCE_STAFF,
  settings: FINANCE_STAFF,
  "audit-logs": FINANCE_STAFF,
};

export const ADMIN_API_ROLE_MATRIX: Record<AdminApiResource, readonly string[]> = {
  config: FINANCE_STAFF,
  prices: FINANCE_STAFF,
  products: COMMERCIAL_STAFF,
  "quotations-status": ["SUPER_ADMIN", "FOUNDER", "SALES_ADMIN", "FINANCE_ADMIN"],
  refunds: FINANCE_STAFF,
  revenue: FINANCE_STAFF,
  "stripe-sync": OWNER_STAFF,
};

export function isAdminSection(section: string): section is AdminSection {
  return Object.prototype.hasOwnProperty.call(ADMIN_SECTION_ROLE_MATRIX, section);
}

export function rolesForAdminSection(section: AdminSection) {
  return ADMIN_SECTION_ROLE_MATRIX[section];
}

export function canAccessAdminSection(role: string, section: string) {
  if (!isStaffRole(role) || !isAdminSection(section)) return false;
  return rolesForAdminSection(section).includes(role);
}

export function canAccessAdminApi(role: string, resource: AdminApiResource) {
  if (!isStaffRole(role)) return false;
  return ADMIN_API_ROLE_MATRIX[resource].includes(role);
}

export function allowedAdminSections(role: string): AdminSection[] {
  return (Object.keys(ADMIN_SECTION_ROLE_MATRIX) as AdminSection[]).filter((section) =>
    canAccessAdminSection(role, section),
  );
}

export function firstAllowedAdminPath(role: string) {
  const allowed = allowedAdminSections(role);
  if (allowed.includes("overview")) return "/admin";
  const first = allowed[0];
  return first ? `/admin/${first}` : "/portal";
}

export function defaultPostLoginPath(role: string) {
  return isStaffRole(role) ? firstAllowedAdminPath(role) : "/portal";
}
