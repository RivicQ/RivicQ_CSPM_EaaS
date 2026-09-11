# RivicQ Security Cloud — core product UX / UI

Deep-space nebula chrome: black canvas `#000000`, violet accent `#7C3AED`, Inter, pill CTAs, sparse starfield. Public pages (Home, Product, CSPM, CBOM, PQC, Enterprise, Security, Pricing, Request demo, IBM, Contact) share `PublicShell`. Overview (`/dashboard`) opens on an inbox queue — not a circular posture gauge. Light mode remains available. This is not IBM Carbon or IBM Plex.

Live surfaces: public home, Community workspace, CBOM/SBOM hubs, docs hub, marketing, RivicQ Graph demo (`/fabric`, formerly NEXUS / FABRIC).

## Intent

Operators should see **one cryptographic SaaS**, not a brochure or a pile of modules.

1. **Inbox first** — today’s findings and scans, then charts.
2. **Discover → mitigate → report** remains the only client path.
3. **Community is honest** — locked Enterprise tiles stay visible, never unlabeled as live.
4. **Nebula is chrome** — canvas `#000000` / surface `#0A0A0F`; violet `#7C3AED` is the brand accent; status color is semantic only.

## Visual tokens

| Token | Value | Use |
|---|---|---|
| Base | `#000000` | App background |
| Surface | `#0A0A0F` | Cards, drawers, tables |
| Border | `#1F1F2E` | 1px dividers |
| Text | `#FFFFFF` / `#D1D5DB` | Primary / muted |
| Accent | `#7C3AED` | Primary actions, focus, nebula glow |
| Status | `#EF4444` `#F97316` `#EAB308` `#38BDF8` `#22C55E` | Critical / high / medium / low / success |
| Type | Inter + JetBrains Mono | UI / IDs |
| Radius | 8 / 12 / 16 / pill | Cards, controls |
| Motion | opacity + short translate | Glow only on hero nebula |

## Information architecture

```
Public (unauthenticated)
  Home → Product / CSPM / CBOM / PQC
  Enterprise / Security / Pricing / Request demo / IBM / Contact
  Docs hub · RivicQ Graph demo (`/fabric`)
Workspace (Community)
  Overview → Scanner → CBOM / SBOM
  Pipeline · API security · Governance · Migration
Enterprise (licensed)
  QBOM · HBOM · AIBOM · IBOM · HSM · Cloud posture · Conformance · Inventory
```

Community cannot open QBOM, HBOM, AIBOM, IBOM, or HSM routes. Those stay locked until a licensed Enterprise workspace. PQC classification on CBOM findings remains Community.

Quantum risk on Pages comes from **scans you run** (CLI or API). GitHub Pages is static and does not attach a live customer estate.

## Core screens

| Screen | Design |
|---|---|
| **Home** | Sticky product nav, nebula hero, CBOM pilot scan |
| **Public product pages** | `PublicShell` + `SitePage`: black canvas, violet pill CTAs, `#0A0A0F` cards |
| **Contact** | Five public desks only; `admin@` is not published; same chrome as Home |
| **Auth / editions** | Single-column workspace form on black |
| **Overview** | Inbox queue + domain strip (AI, DevSecOps, cloud, API, GRC, quantum) |
| **CBOM / SBOM / pipeline / governance** | Shared page header + nebula evidence cards |
| **Docs hub** | Same chrome, grouped legal/product lists |
| **RivicQ Graph** | Labeled synthetic graph demo at `/fabric` |

## Do not

- Restore IBM Plex, Carbon Gray 100, or trademark banners
- Restore Horizon sky-blue / navy split login / circular posture gauge as the product identity
- Restore cream / terracotta Command Center chrome as the public site
- Present demo data as customer telemetry
- Treat mappings as certifications
- Require IBM Quantum hardware for QBOM scores
- Claim QSIC as shipped silicon
- Claim a silent real-time quantum feed on GitHub Pages
