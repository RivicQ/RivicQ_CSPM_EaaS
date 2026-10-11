# Firmware & identity analysis API

The platform exposes the same static-analysis engines the `rivicq` CLI uses over
HTTP, so a partner integration and the local gate share one implementation. The
routes live under the normal `/api/v1` group and inherit the deny-by-default
auth gate, the RBAC permission model, tenant resolution, size limits and audit
logging.

Endpoints are edition-agnostic: they are registered from
`shared.SetupFirmwareIdentityRoutes`, which runs in both the Community (OSS) and
Enterprise route tables.

## Endpoints

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/firmware/analyze` | `scans:start` | Statically analyze one firmware artifact |
| `POST` | `/api/v1/firmware/compare` | `scans:start` | Diff two firmware artifacts |
| `GET`  | `/api/v1/firmware/profiles` | `cbom:read` | List embedded-domain profiles |
| `GET`  | `/api/v1/firmware/limits` | `cbom:read` | Firmware analysis safety limits |
| `POST` | `/api/v1/identity/analyze` | `scans:start` | Statically analyze one identity artifact |
| `GET`  | `/api/v1/identity/profiles` | `cbom:read` | List identity-domain profiles |
| `GET`  | `/api/v1/identity/limits` | `cbom:read` | Identity analysis safety limits |

Authorization is enforced by the coarse resource/verb table in
`internal/auth/route_permissions.go`: reads need `cbom:read` (viewer+), analysis
needs `scans:start` (analyst/operator/admin). A viewer can read profiles and
limits but cannot run an analysis.

## Requests

Every analysis endpoint accepts **either** `multipart/form-data` **or**
`application/json`.

### Multipart

| Endpoint | File fields | Form fields |
| --- | --- | --- |
| `firmware/analyze`, `identity/analyze` | `file` | `profile`, `device_lifetime` |
| `firmware/compare` | `from`, `to` | `profile`, `device_lifetime` |

```bash
curl -H "Authorization: Bearer $TOKEN" \
  -F "file=@firmware.bin" \
  -F "profile=embedded/infineon" \
  -F "device_lifetime=10y+" \
  http://localhost:9099/api/v1/firmware/analyze
```

### JSON (base64)

```jsonc
// firmware/analyze, identity/analyze
{ "file_name": "firmware.bin", "content_base64": "<b64>", "profile": "embedded/infineon", "device_lifetime": "10y+" }

// firmware/compare
{ "from_file_name": "v1.bin", "from_content_base64": "<b64>", "to_file_name": "v2.bin", "to_content_base64": "<b64>", "profile": "embedded/infineon" }
```

`profile` is optional; an unknown or empty profile falls back to the domain
default (`embedded/generic` or `identity/generic`). `device_lifetime` accepts
`<2y`, `2-5y`, `5-10y`, `10y+` (or `unknown`).

## Responses

```jsonc
{
  "report":   { /* firmware.Report or identity.Report: format, SHA-256, algorithms,
                    crypto libraries, certificates, CBOM, PQC plan, graph */ },
  "decision": { "decision": "PASS|WARN|BLOCK", "block_count": 4, "warn_count": 2,
                "blocked": ["ECDSA", "..."], "warned": ["AES", "..."] },
  "engine":   "firmware-static | identity-static",
  "tenant_id": "<resolved tenant>",
  "edition":  "community|professional|enterprise",
  "note":     "Static metadata analysis ... the artifact is never executed."
}
```

`firmware/compare` returns `{ "diff": <firmware.Diff>, ... }`. The `decision`
field mirrors the CLI `--fail-on` gate: `BLOCK` when any algorithm is
`migration_required`/`broken_classical` or a certificate is
`quantum_vulnerable`; `WARN` when only `migration_recommended` items exist.

Status codes: `200` success, `400` missing/invalid input, `413` artifact over the
size limit, `422` the artifact could not be analyzed.

## Limits and safety

- The request body is hard-capped with `http.MaxBytesReader` **before** parsing
  (68 MiB firmware, 36 MiB identity, including multipart framing).
- Each artifact is additionally checked against the engine limit
  (`firmware.DefaultLimits().MaxFileBytes` = 64 MiB,
  `identity.DefaultLimits().MaxFileBytes` = 32 MiB).
- Only the reported metadata is returned. The engines never execute the artifact
  and never extract private keys, credential secrets, SIM secrets or
  secure-element secrets; subscriber markers are reported by name only.

## Running the POC

```bash
./scripts/poc/partner_artifact_analysis.sh
```

The script builds the OSS server, starts it in an isolated working directory
(in-memory auth, no database), authenticates as the demo operator, then runs
`firmware/analyze`, `identity/analyze`, `firmware/compare` and an anonymous
deny-by-default check against the committed partner fixtures.

## Related

- [Firmware static analysis](FIRMWARE_ANALYSIS.md) · [Identity & certificate analysis](IDENTITY_CRYPTO.md)
- [Embedded crypto model](EMBEDDED_CRYPTO.md) · [PQC: embedded](PQC_EMBEDDED.md)
- [OpenAPI spec](openapi.yaml)
