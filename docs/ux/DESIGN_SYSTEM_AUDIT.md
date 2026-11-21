# Design system audit

Source of truth: `web/src/theme/tokens.ts`, `theme.ts`, `designSystem.ts`, `components/ui/*`.

Present: GlassCard, EmptyState, PageFrame, DetailTabs, ProvenanceChip, StatusChip (icon + text + aria-label).

Gaps: no shared DataTable, Dialog, or Toast primitive. Pages still use one-off MUI Table. Do not add decorative charts without a question.

Visual language: nebula ledger (black / violet). Restrain animation (`prefers-reduced-motion` honored in Layout).
