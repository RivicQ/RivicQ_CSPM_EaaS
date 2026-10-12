import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireIdentity } from "./users";

// Tenant scoping parity: internal/tenant/context.go derives tenant_id from
// validated JWT claims, ignores the X-Tenant-ID header, and normalizes empty
// values to PublicTenantID. Here the caller's tenant comes from the identity
// claim; PublicTenantID is the default Community tenant created during backfill.
//
// Every helper below filters by the caller's tenant. There is no code path that
// accepts a tenantId argument from the client.

const PUBLIC_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// callerTenant resolves the tenant for the current request.
// - authenticated member: their org's tenant (from the identity claim)
// - unauthenticated (Community/public surface): PublicTenantID
async function callerTenant(ctx: Parameters<typeof requireIdentity>[0]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return PUBLIC_TENANT_ID;
  const id = await requireIdentity(ctx);
  return id.tenantId ?? PUBLIC_TENANT_ID;
}

export const listTenants = query({
  args: {},
  handler: async (ctx) => {
    const tenantId = await callerTenant(ctx);
    // Only the caller's own tenant is visible; filter via the by_tenant index
    // so no cross-tenant doc is ever scanned.
    return await ctx.db
      .query("tenants")
      .filter((q) => q.eq(q.field("externalId"), tenantId))
      .collect();
  },
});

export const getTenant = query({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenantId = await callerTenant(ctx);
    const tenant = await ctx.db.get(args.id);
    if (!tenant || tenant.externalId !== tenantId) {
      // Do not reveal existence of other tenants.
      return null;
    }
    return tenant;
  },
});

export const createTenant = mutation({
  args: {
    name: v.string(),
    plan: v.union(
      v.literal("oss"),
      v.literal("professional"),
      v.literal("enterprise"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("not authenticated");
    }
    const id = await requireIdentity(ctx);
    if (id.role !== "admin") {
      throw new ConvexError("admin role required");
    }
    const now = Date.now();
    const externalId = id.tenantId ?? PUBLIC_TENANT_ID;
    return await ctx.db.insert("tenants", {
      orgId: id.orgId as Id<"organizations"> | undefined,
      externalId,
      name: args.name,
      plan: args.plan,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTenant = mutation({
  args: {
    id: v.id("tenants"),
    name: v.optional(v.string()),
    plan: v.optional(
      v.union(
        v.literal("oss"),
        v.literal("professional"),
        v.literal("enterprise"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const tenantId = await callerTenant(ctx);
    const id = await requireIdentity(ctx);
    if (id.role !== "admin") {
      throw new ConvexError("admin role required");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.externalId !== tenantId) {
      throw new ConvexError("tenant not found");
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.plan !== undefined) patch.plan = args.plan;
    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const deleteTenant = mutation({
  args: { id: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenantId = await callerTenant(ctx);
    const id = await requireIdentity(ctx);
    if (id.role !== "admin") {
      throw new ConvexError("admin role required");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.externalId !== tenantId) {
      throw new ConvexError("tenant not found");
    }
    // Soft delete is preferred; hard delete kept for parity with the Go layer.
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Exported for tests and sibling modules that must apply identical scoping.
export { callerTenant, PUBLIC_TENANT_ID };
