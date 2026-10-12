# Cloudflare R2 integration

Object storage for BOM reports and scan artifacts, served from the edge and
referenced by `boms.r2Key` in the Convex schema.

## Setup

1. Create a bucket (e.g. `rivicq-artifacts`) in the Cloudflare dashboard.
2. Create an R2 API token scoped to that bucket (Access Key ID + Secret).
3. Configure CORS on the bucket to allow `PUT`/`GET` from the web origin:
   - Allowed methods: `GET`, `PUT`, `HEAD`
   - Allowed origins: your web app origin(s)
   - Allowed headers: `content-type`, `etag`
   - Max age: 3000
4. Deploy the worker (`src/worker.ts`):
   ```bash
   npx wrangler deploy --config integrations/r2/wrangler.toml
   ```
5. Set worker secrets (never in `wrangler.toml`):
   ```bash
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   wrangler secret put R2_ACCOUNT_ID
   ```

## Environment

| Var | Purpose |
| --- | --- |
| `R2_ACCESS_KEY_ID` | R2 token access key id (worker secret) |
| `R2_SECRET_ACCESS_KEY` | R2 token secret (worker secret) |
| `R2_ACCOUNT_ID` | Cloudflare account id, used to build the S3 endpoint |
| `R2_BUCKET` | Bucket name (default `rivicq-artifacts`) |

`.dev.vars.example` holds local placeholders only.

## Signed URL flow

1. Client asks the worker `POST /upload` with `{ key, contentType, size }`.
2. Worker **validates content-type against an allowlist and size against a cap**,
   then returns a short-lived presigned `PUT` URL (AWS Signature V4).
3. Client uploads directly to R2 with that URL; the worker never proxies bytes.
4. Reads use `GET /object/:key`, which returns a short-lived presigned `GET` URL.
5. Deletes use `DELETE /object/:key`.

## Why validation must be server-side

Presigned URLs bypass the worker for the actual transfer, so the worker is the
only place to enforce policy. Always validate before signing:

- **Content type**: accept only known-safe types (e.g. JSON, SPDX/CycloneDX,
  text). Never sign arbitrary `content-type` values.
- **Size**: enforce a maximum; an unbounded presign is a storage/DoS risk.
- The signature binds to the declared type/size via headers where possible; keep
  the expiry short (minutes, not hours).

## Notes

- Prefer scoping each key by tenant: `tenants/<tenantId>/boms/<id>.json`. The
  worker only signs keys; the caller must be authorized to that tenant by the
  API layer before requesting a URL.
