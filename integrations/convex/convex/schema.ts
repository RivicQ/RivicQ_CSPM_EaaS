import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema mirrors the existing domain so the read path (phase 2) can be shadowed
// before Postgres is retired. Mapping to the Go layer:
//   organizations -> new (Better Auth organization plugin grouping)
//   members       -> authn.User {id,tenant_id,email,name,role| org membership}
//   tenants       -> database.tenants (deploy/migrations/001_initial_schema.sql)
//   assets        -> database.assets (internal/api/enterprise/inventory.go Asset)
//   scans         -> database.scan_jobs (internal/discovery/* scan jobs)
//   findings      -> database.findings (internal/intelligence/finding.go)
//   boms          -> database.bom_reports (internal/bom/*)
//   apiKeys       -> database.api_keys (internal/api/enterprise/apikeys.go)
//   auditLogs     -> database.audit_events (internal/middleware audit)
export default defineSchema({
  // Organization groups users and owns tenants. Mirrors the Better Auth
  // organization concept; tenantId on children is the isolation key.
  organizations: defineTable({
    name: v.string(),
    slug: v.optional(v.string()),
    plan: v.union(
      v.literal("oss"),
      v.literal("professional"),
      v.literal("enterprise"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  // Membership of a user in an org with a role. Roles match internal/authn/authn.go:
  // admin > operator > analyst > viewer.
  members: defineTable({
    orgId: v.id("organizations"),
    userId: v.string(), // Better Auth user id
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("operator"),
      v.literal("analyst"),
      v.literal("viewer"),
    ),
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_tenant", ["tenantId"]),

  // Workspace/tenant. PublicTenantID from internal/tenant/context.go maps here
  // as the default Community tenant.
  tenants: defineTable({
    orgId: v.optional(v.id("organizations")),
    externalId: v.string(), // the Postgres tenants.id value
    name: v.string(),
    plan: v.string(), // 'oss' | 'professional' | 'enterprise'
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_org", ["orgId"]),

  // Cryptographic asset inventory. Mirrors database.assets.
  assets: defineTable({
    tenantId: v.string(),
    name: v.string(),
    cloudProvider: v.optional(v.string()),
    category: v.optional(v.string()),
    algorithm: v.optional(v.string()),
    keySize: v.optional(v.number()),
    quantumSafe: v.boolean(),
    riskLevel: v.string(), // 'UNKNOWN' | ...
    complianceScore: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_risk", ["tenantId", "riskLevel"]),

  // Scan jobs. Mirrors database.scan_jobs (status/scan_type/findings).
  scans: defineTable({
    tenantId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    scanType: v.string(), // 'quick' | 'full' | ...
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    findingsCount: v.number(),
    requestedBy: v.optional(v.string()), // Better Auth user id
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"]),

  // Findings produced by a scan. Mirrors database.findings.
  findings: defineTable({
    tenantId: v.string(),
    scanId: v.id("scans"),
    assetId: v.optional(v.id("assets")),
    severity: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("info"),
    ),
    title: v.string(),
    description: v.optional(v.string()),
    control: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_scan", ["scanId"])
    .index("by_tenant_severity", ["tenantId", "severity"]),

  // BOM reports (CycloneDX/SPDX JSON). Mirrors database.bom_reports.
  boms: defineTable({
    tenantId: v.string(),
    assetId: v.optional(v.id("assets")),
    scanId: v.optional(v.id("scans")),
    format: v.string(), // 'cyclonedx' | 'spdx'
    content: v.any(),
    r2Key: v.optional(v.string()), // pointer into Cloudflare R2 when large
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_asset", ["assetId"]),

  // API keys. Mirrors database.api_keys. Store only a hash, never the raw key.
  apiKeys: defineTable({
    tenantId: v.string(),
    name: v.string(),
    keyHash: v.string(),
    prefix: v.string(), // non-secret lookup prefix
    scopes: v.array(v.string()),
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_prefix", ["prefix"]),

  // Audit event log. Mirrors database.audit_events.
  auditLogs: defineTable({
    tenantId: v.optional(v.string()),
    eventType: v.string(),
    actorId: v.optional(v.string()),
    requestId: v.optional(v.string()),
    method: v.optional(v.string()),
    path: v.optional(v.string()),
    status: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_created_at", ["createdAt"]),
});
