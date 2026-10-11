# G+D readiness

RivicQ's identity & connectivity vertical slice as it applies to a G+D-class
SIM/eSIM/iSIM/eUICC and PKI portfolio. G+D is one **domain profile**
(`identity/gd`), not a fork.

> Metadata only. No subscriber credential (Ki/OPc), no profile, no token, no
> private key is read or emitted. Markers are standards-based (GSMA SGP.22/32,
> GlobalPlatform, JavaCard) — no proprietary G+D API is hardcoded.

## Capability mapping

| Requirement | Where it lives | Status |
|---|---|---|
| SIM/eSIM/iSIM/eUICC model | `internal/identity` + `cryptoart` kinds | ✅ |
| Secure element model | `identity` (`secure_element`) | ✅ |
| Device identity artifact | `identity.IdentityRef` | ✅ |
| Certificate metadata + lifecycle risk | `internal/certeng` | ✅ |
| PKI / CA chain modelling | `identity.PKIRef` + graph `issued_by`/`belongs_to` | ✅ |
| TLS + IoT connectivity mapping | `cryptoscan` protocols | ✅ |
| CBOM / PQC plan for identity | `identity.buildCBOM`, `BuildPQCPlan` | ✅ |
| CLI `rivicq identity *` | `cmd/rivicq/identity.go` | ✅ |
| API `/api/v1/identity/*` | `internal/api/*` | ⏳ P1 |
| PKI/CA/IdP/eUICC connectors | `internal/connectors` | ⏳ P2 (`CONNECTOR REQUIRED`) |

## CLI

```bash
rivicq identity scan device.pem   --profile identity/gd --format json
rivicq identity cbom esim-config.txt
rivicq identity pqc  device.pem   --device-lifetime 10y+
```

## Fixtures

`fixtures/partners/gd/` — synthetic only:
`certificate`, `pki`, `device-identity`, `esim`, `tls`, `iot`, `pqc`.

## Readiness score

| Area | Score | Note |
|---|---|---|
| Certificate engine | 9/10 | full X.509 metadata + quantum/expiry/classical risk |
| Identity/eUICC modelling | 7/10 | standards markers; no profile/token access |
| PKI chain modelling | 7/10 | issuer grouping + graph; no OCSP/CRL live checks |
| PQC planning | 8/10 | shared taxonomy; no CAVP claim |
| API surface | 3/10 | P1 pending |
| Live connector (PKI/CA/IdP/eUICC) | 0/10 | P2, marked `CONNECTOR REQUIRED` |

Honest ceiling: RivicQ ingests **artifacts, certificates and configs**. A live
G+D PKI/CA or eUICC RSP integration is a connector (P2), not a fabricated API.
