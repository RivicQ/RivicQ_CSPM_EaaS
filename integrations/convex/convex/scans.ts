import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { callerTenant, PUBLIC_TENANT_ID } from "./tenants";

// Scans mirror database.scan_jobs. All reads and writes are tenant-scoped using
// the tenant derived from the caller's identity (see tenants.ts, which mirrors
// internal/tenant/context.go). scanId lookups re-check ownership.

const severityValidator = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("info"),
);

export const createScan = mutation({
  args: {
    scanType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const tenantId = await callerTenant(ctx);
    const now = Date.now();
    const scanId = await ctx.db.insert("scans", {
      tenantId,
      status: "pending",
      scanType: args.scanType,
      findingsCount: 0,
      requestedBy: identity?.subject,
      createdAt: now,
    });
    return scanId;
  },
});

export const getScan = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, args) => {
    const tenantId = await callerTenant(ctx);
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.tenantId !== tenantId) {
      // Hide cross-tenant existence.
      return null;
    }
    const findings = await ctx.db
      .query("findings")
      .withIndex("by_scan", (q) => q.eq("scanId", args.scanId))
      .collect();
    return { scan, findings };
  },
});

export const listScansForTenant = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    // Tenant comes from identity; no tenantId argument is accepted.
    const tenantId = await callerTenant(ctx);
    if (args.status) {
      return await ctx.db
        .query("scans")
        .withIndex("by_tenant_status", (q) =>
          q.eq("tenantId", tenantId).eq("status", args.status!),
        )
        .collect();
    }
    return await ctx.db
      .query("scans")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// recordScanResults is internal: called by the scan worker (or an HTTP action),
// never directly by clients. The tenantId must be supplied by the caller process,
// which is trusted, but we still validate it is non-empty.
export const recordScanResults = internalMutation({
  args: {
    scanId: v.id("scans"),
    tenantId: v.string(),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
    ),
    findings: v.array(
      v.object({
        assetId: v.optional(v.id("assets")),
        severity: severityValidator,
        title: v.string(),
        description: v.optional(v.string()),
        control: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (!args.tenantId) {
      throw new ConvexError("tenantId is required");
    }
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.tenantId !== args.tenantId) {
      throw new ConvexError("scan not found for tenant");
    }
    const now = Date.now();
    for (const f of args.findings) {
      await ctx.db.insert("findings", {
        tenantId: args.tenantId,
        scanId: args.scanId,
        assetId: f.assetId,
        severity: f.severity,
        title: f.title,
        description: f.description,
        control: f.control,
        createdAt: now,
      });
    }
    await ctx.db.patch(args.scanId, {
      status: args.status,
      findingsCount: args.findings.length,
      completedAt: now,
    });
    return { scanId: args.scanId, findings: args.findings.length };
  },
});

export { PUBLIC_TENANT_ID };
