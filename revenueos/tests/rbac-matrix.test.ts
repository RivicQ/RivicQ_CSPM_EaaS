import { describe, expect, it } from "vitest";
import {
  ADMIN_API_ROLE_MATRIX,
  ADMIN_SECTION_ROLE_MATRIX,
  canAccessAdminApi,
  canAccessAdminSection,
  defaultPostLoginPath,
  firstAllowedAdminPath,
} from "../lib/rbac";

describe("admin RBAC matrix", () => {
  it("defines explicit section-to-role coverage for sensitive areas", () => {
    expect(ADMIN_SECTION_ROLE_MATRIX.payments).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    expect(ADMIN_SECTION_ROLE_MATRIX.invoices).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    expect(ADMIN_SECTION_ROLE_MATRIX.analytics).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    expect(ADMIN_SECTION_ROLE_MATRIX.pricing).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    expect(ADMIN_SECTION_ROLE_MATRIX.stripe).toEqual(["SUPER_ADMIN", "FOUNDER"]);
    expect(ADMIN_SECTION_ROLE_MATRIX.settings).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    expect(ADMIN_SECTION_ROLE_MATRIX["audit-logs"]).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
  });

  it("prevents SALES_USER from reading finance, audit logs, Stripe config, invoices, or revenue data", () => {
    expect(canAccessAdminSection("SALES_USER", "payments")).toBe(false);
    expect(canAccessAdminSection("SALES_USER", "invoices")).toBe(false);
    expect(canAccessAdminSection("SALES_USER", "analytics")).toBe(false);
    expect(canAccessAdminSection("SALES_USER", "pricing")).toBe(false);
    expect(canAccessAdminSection("SALES_USER", "stripe")).toBe(false);
    expect(canAccessAdminSection("SALES_USER", "settings")).toBe(false);
    expect(canAccessAdminSection("SALES_USER", "audit-logs")).toBe(false);
    expect(canAccessAdminApi("SALES_USER", "revenue")).toBe(false);
  });

  it("allows SALES_USER only explicitly permitted commercial sections", () => {
    expect(canAccessAdminSection("SALES_USER", "products")).toBe(true);
    expect(canAccessAdminSection("SALES_USER", "customers")).toBe(true);
    expect(canAccessAdminSection("SALES_USER", "quotations")).toBe(true);
    expect(canAccessAdminSection("SALES_USER", "services")).toBe(true);
    expect(canAccessAdminSection("SALES_USER", "overview")).toBe(false);
  });

  it("enforces API-level role checks", () => {
    expect(ADMIN_API_ROLE_MATRIX.refunds).toEqual(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    expect(canAccessAdminApi("SALES_USER", "refunds")).toBe(false);
    expect(canAccessAdminApi("SALES_USER", "revenue")).toBe(false);
    expect(canAccessAdminApi("SALES_USER", "prices")).toBe(false);
    expect(canAccessAdminApi("SALES_USER", "stripe-sync")).toBe(false);
    expect(canAccessAdminApi("SALES_ADMIN", "stripe-sync")).toBe(false);
    expect(canAccessAdminApi("SALES_USER", "products")).toBe(true);
  });

  it("routes staff to an allowed admin area and customers to portal", () => {
    expect(firstAllowedAdminPath("SALES_USER")).toBe("/admin/products");
    expect(firstAllowedAdminPath("FINANCE_ADMIN")).toBe("/admin");
    expect(defaultPostLoginPath("CUSTOMER")).toBe("/portal");
    expect(defaultPostLoginPath("SALES_USER")).toBe("/admin/products");
  });
});
