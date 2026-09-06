# RivicQ Security Cloud — core product UX / UI

Dark-native zinc enterprise chrome (Linear/Raycast density). Light mode remains available. This is not IBM Carbon or IBM Plex. NEXUS at `/nexus` is a separate identity.

Live surfaces: public home, Community workspace, Five-BOM hubs, docs hub.

Mockups (also on GitHub Pages after merge):

![Public home](../media/ux/rivicq-horizon-home.png)

![Command Center](../media/ux/rivicq-horizon-workspace.png)

## Intent

Operators should see **one cryptographic product**, not a pile of enterprise modules.

1. **Five-BOM is the identity** — QBOM · AIBOM · SBOM · IBOM · CBOM tiles on home, app bar, and workspace.
2. **Discover → mitigate → report** remains the only client path.
3. **Community is honest** — locked Enterprise tiles stay visible, never unlabeled as live.
4. **Zinc is chrome** — sidebar and command surfaces sit on `#09090B` / `#18181B`; status color is semantic only.

## Visual tokens

| Token | Value | Use |
|---|---|---|
| Base | `#09090B` | App background |
| Surface | `#18181B` | Cards, drawers, tables |
| Border | `#27272A` | 1px dividers |
| Text | `#FAFAFA` / `#A1A1AA` | Primary / muted |
| Status | `#EF4444` `#F97316` `#F59E0B` `#3B82F6` `#10B981` | Critical / high / medium / low / success |
| Type | Inter + JetBrains Mono | UI / IDs |
| Type | Outfit 400–800 + JetBrains Mono | UI + metrics |
| Radius | 6 / 10 / 14 / 20 / pill | Cards, pills, search |
| Motion | opacity only | No blur, no neon glow, no hover-lift |

Primary buttons on light pages are **sky fill** (`#0284c7`) with a soft sky shadow. Navy is reserved for chrome, not every CTA.

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
| **Home** | Pill nav, editorial headline, five BOM letter tiles, scan card, horizon wash |
| **Auth / editions** | Split navy briefing + white form on sky canvas |
| **Command Center** | Navy horizon hero, five-BOM strip, community-first actions |
| **Five-BOM / pipeline / governance** | Shared `PageFrame` navy header + white evidence cards |
| **Docs hub** | Same horizon, pill CTAs, 16px cards, grouped legal/product lists |
| **Contact directory** | Five-area cards, complete priority table, sky mail chips; `admin@` has no mailto |

## Do not

- Restore IBM Plex, Carbon Gray 100, or trademark banners
- Present demo data as customer telemetry
- Treat mappings as certifications
- Require IBM Quantum hardware for QBOM scores
- Claim QSIC as shipped silicon
