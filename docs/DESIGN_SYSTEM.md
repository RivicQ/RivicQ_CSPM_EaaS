# RivicQ design tokens

Source of truth for chrome: [`web/src/theme/tokens.ts`](../web/src/theme/tokens.ts), [`web/src/theme/designSystem.ts`](../web/src/theme/designSystem.ts), [`web/src/theme/websiteChrome.ts`](../web/src/theme/websiteChrome.ts), [`docs/assets/horizon-docs.css`](assets/horizon-docs.css).

Do not invent a second palette. Public site, console, docs, and RivicQ Graph use this system.

## Colors

| Token | Value | Use |
|---|---|---|
| Background | `#000000` | Canvas |
| Surface | `#0A0A0F` | Cards, drawers |
| Elevated | `#12121A` | Raised panels |
| Border | `#1F1F2E` | 1px rules |
| Text | `#FFFFFF` | Primary |
| Muted | `#D1D5DB` / `#9CA3AF` | Secondary / faint |
| Primary | `#7C3AED` | Brand, CTAs, focus |
| Primary hover | `#6D28D9` | Pressed CTA |
| Quantum | `#7C3AED` | PQC / nebula |
| Critical | `#EF4444` | Findings |
| High | `#F97316` | Findings (severity only) |
| Medium | `#EAB308` | Findings |
| Low / info | `#38BDF8` | Findings |
| Success | `#22C55E` | Healthy / pass |

Warning amber is **severity**, not brand. Demo and chrome chips use primary violet.

## Type, space, motion

- UI: Inter. IDs / emails: JetBrains Mono.
- Radius: 8 / 12 / 16 / pill (`9999`).
- Motion: short opacity/translate. Glow only on the public nebula hero. Honor `prefers-reduced-motion`.

## Logo

Official mark: geometric **R** on a rounded black square (`web/public/brand/rivicq-mark.svg`). Do not replace it with orbits, hex shields, or a lock. Wordmark is **RivicQ** (Inter, weight 600) with caption **Cryptographic Security Posture Management**.

## Components

Public pages: `PublicShell` + `SitePage` + `websiteCtaSx`.  
Console: `Layout` + `PageFrame` + `InboxHero`.  
Do not add cream `#C4783A` or sky-blue chrome.
