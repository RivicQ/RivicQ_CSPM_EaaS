# RivicQ Security Cloud — core product UX / UI

Warm-ink enterprise SaaS chrome (ledger density, copper accent). Public home is a product site with a labeled console preview. Sign-in is a single-column workspace form. Command Center opens on an inbox queue — not a circular posture gauge. Light mode remains available. This is not IBM Carbon or IBM Plex. NEXUS at `/nexus` is a separate identity.

Live surfaces: public home, Community workspace, Five-BOM hubs, docs hub.

## Intent

Operators should see **one cryptographic SaaS**, not a brochure or a pile of modules.

1. **Inbox first** — today’s findings and scans, then charts.
2. **Discover → mitigate → report** remains the only client path.
3. **Community is honest** — locked Enterprise tiles stay visible, never unlabeled as live.
4. **Warm ink is chrome** — canvas `#0C0B09` / surface `#17150F`; copper `#C4783A` is the only brand accent; status color is semantic only.

## Visual tokens

| Token | Value | Use |
|---|---|---|
| Base | `#0C0B09` | App background |
| Surface | `#17150F` | Cards, drawers, tables |
| Border | `#2C281F` | 1px dividers |
| Text | `#F3EEE4` / `#B8B0A2` | Primary / muted |
| Accent | `#C4783A` | Primary actions, focus |
| Status | `#D64545` `#D97706` `#C9A227` `#3D7AB8` `#3D9B7A` | Critical / high / medium / low / success |
| Type | Source Sans 3 + Source Code Pro | UI / IDs |
| Radius | 4 / 6 / 8 / 10 / pill | Cards, controls |
| Motion | opacity + short translate | No blur, no neon glow, no hover-lift |

## Information architecture

```
Public
  Home → Demo | Sign in | Docs | Contact
Workspace (Community)
  Command Center → Scanner → Five-BOM
  Pipeline · API security · AI security · HSM/Quantum · Governance · Migration · Contact
Enterprise (licensed)
  Cloud posture · Conformance · Inventory · Compliance · Quantum · CSPM
Docs hub
  Launch paths · @rivicq.com directory · Legal / Product / Honesty lists
```

Community can open every Five-BOM route. AIBOM, IBOM, HSM connectors, and the GRC pack stay locked until a paid edition.

## Core screens

| Screen | Design |
|---|---|
| **Home** | Sticky product nav, editorial headline, labeled console preview, terminal scan |
| **Auth / editions** | Single-column workspace form on warm ink |
| **Command Center** | Inbox queue + compact metrics, no circular gauge |
| **Five-BOM / pipeline / governance** | Shared page header + evidence cards |
| **Docs hub** | Same chrome, grouped legal/product lists |
| **Contact directory** | Five-area cards; `admin@` has no mailto |

## Do not

- Restore IBM Plex, Carbon Gray 100, or trademark banners
- Restore Horizon sky-blue / navy split login / circular posture gauge as the product identity
- Present demo data as customer telemetry
- Treat mappings as certifications
- Require IBM Quantum hardware for QBOM scores
- Claim QSIC as shipped silicon
