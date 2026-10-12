// Cloudflare Worker: presigned R2 uploads/downloads
//
// Deps (intentionally not installed by this scaffold, but available on npm):
//   - aws4fetch: https://github.com/mhart/aws4fetch
//   - optionally hono: https://hono.dev (not used to keep a single file)
//
// Policy: validate content-type against allowlist and size against MAX_UPLOAD_BYTES
// on POST /upload. Never trust client-supplied content-type alone when using the
// signed upload against an app origin. Explicitly limit origins and methods.
// AuthN/Z: before calling this worker, verify the caller is authorized to write
// into the tenant-scoped key (e.g. from the existing Go API or a future Convex
// action). The worker does not itself enforce the user identity.

export interface Env {
  ARTIFACTS: R2Bucket;
  R2_BUCKET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  ALLOWED_ORIGIN: string;
  MAX_UPLOAD_BYTES: string;
}

const JSON_TYPES = new Set([
  "application/json",
  "application/vnd.cyclonedx+json",
  "application/spdx+json",
]);

const TEXT_TYPES = new Set([
  "text/plain",
  "text/yaml",
  "text/csv",
]);

function contentTypeAllowed(ct: string | null): boolean {
  if (!ct) return false;
  return JSON_TYPES.has(ct) || TEXT_TYPES.has(ct);
}

async function signUrl(
  env: Env,
  key: string,
  method: "GET" | "PUT",
  headers: Record<string, string> = {},
): Promise<string> {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("missing R2 signing credentials");
  }
  // Lazy import to avoid bundling unless needed; aws4fetch is present in the
  // Cloudflare worker environment when installed.
  const { AwsClient } = await import("aws4fetch");
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
  });
  const url = new URL(
    `https://${accountId}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`,
  );
  return await client.sign(url, {
    method,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || origin,
      "Access-Control-Allow-Methods": "POST,GET,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname === "/upload" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          key?: string;
          contentType?: string;
          size?: number;
        };
        const key = (body.key || "").trim();
        if (!key) {
          return new Response("key required", { status: 400, headers: cors });
        }
        if (key.includes("..") || key.includes("\0")) {
          return new Response("invalid key", { status: 400, headers: cors });
        }
        const ct = body.contentType || "";
        if (!contentTypeAllowed(ct)) {
          return new Response("content-type not allowed", {
            status: 415,
            headers: cors,
          });
        }
        const size = typeof body.size === "number" ? body.size : -1;
        const max = Number(env.MAX_UPLOAD_BYTES || "10485760");
        if (size < 0 || size > max) {
          return new Response("size not allowed", { status: 413, headers: cors });
        }
        const presignedUrl = await signUrl(env, key, "PUT", {
          "content-type": ct,
        });
        return Response.json({ url: presignedUrl, key }, { headers: cors });
      } catch (e) {
        return new Response((e as Error).message || "bad request", {
          status: 400,
          headers: cors,
        });
      }
    }

    if (url.pathname.startsWith("/object/") && request.method === "GET") {
      const key = url.pathname.slice("/object/".length);
      if (!key) {
        return new Response("key required", { status: 400, headers: cors });
      }
      try {
        const presignedUrl = await signUrl(env, key, "GET", {});
        return Response.json({ url: presignedUrl }, { headers: cors });
      } catch (e) {
        return new Response((e as Error).message, { status: 500, headers: cors });
      }
    }

    if (url.pathname.startsWith("/object/") && request.method === "DELETE") {
      const key = url.pathname.slice("/object/".length);
      if (!key) {
        return new Response("key required", { status: 400, headers: cors });
      }
      await env.ARTIFACTS.delete(key);
      return new Response(null, { status: 204, headers: cors });
    }

    return new Response("not found", { status: 404, headers: cors });
  },
} as ExportedHandler<Env>;
