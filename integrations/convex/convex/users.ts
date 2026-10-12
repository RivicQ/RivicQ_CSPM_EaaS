import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Identity helpers. We NEVER trust client-supplied org/tenant ids; the only
// source of truth is the validated Better Auth JWT exposed via getUserIdentity().
// This mirrors internal/tenant/context.go, where tenant_id comes from JWT claims
// and spoofable headers are ignored.

export type Identity = {
  userId: string;
  orgId?: string;
  tenantId?: string;
  email?: string;
  role?: string;
};

export async function requireIdentity(
  ctx: QueryCtx | MutationCtx,
): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("not authenticated");
  }
  return {
    userId: identity.subject,
    // The convex() plugin augments the JWT payload; org/tenant claims are added
    // by Better Auth's organization plugin in convex/auth.config.ts.
    orgId: (identity as Record<string, unknown>).orgId as string | undefined,
    tenantId: (identity as Record<string, unknown>).tenantId as
      | string
      | undefined,
    email: identity.email ?? undefined,
    role: (identity as Record<string, unknown>).role as string | undefined,
  };
}

export async function requireOrgId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const id = await requireIdentity(ctx);
  if (!id.orgId) {
    throw new ConvexError("caller is not a member of any organization");
  }
  return id.orgId;
}

// me returns the current user's membership row. The org is derived from the
// identity, so a caller can only ever read their own membership.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const { userId, orgId } = await requireIdentity(ctx);
    const membership = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return null;
    // Guard: the membership must belong to the caller's org claim.
    if (orgId && membership.orgId !== orgId) return null;
    return membership;
  },
});

// listOrgMembers returns every member of the caller's org. The org is taken from
// the identity; an orgId argument is not accepted.
export const listOrgMembers = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);
    const members = await ctx.db
      .query("members")
      .withIndex("by_org", (q) => q.eq("orgId", orgId as Id<"organizations">))
      .collect();
    return members;
  },
});

// createOrgMember is admin-gated and always stamps the caller's own orgId; the
// tenant is inherited from the caller (never from args).
export const createOrgMember = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("operator"),
      v.literal("analyst"),
      v.literal("viewer"),
    ),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);
    if (!caller.orgId) {
      throw new ConvexError("caller is not a member of any organization");
    }
    if (caller.role !== "admin") {
      throw new ConvexError("admin role required");
    }
    const callerMember = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", caller.userId))
      .first();
    if (!callerMember) {
      throw new ConvexError("caller membership not found");
    }
    const now = Date.now();
    return await ctx.db.insert("members", {
      orgId: callerMember.orgId,
      userId: args.userId,
      email: args.email,
      name: args.name,
      role: args.role,
      tenantId: callerMember.tenantId,
      createdAt: now,
      updatedAt: now,
    });
  },
});
