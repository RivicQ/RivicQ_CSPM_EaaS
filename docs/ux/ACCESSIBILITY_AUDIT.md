# Accessibility audit

Target: WCAG 2.2 AA. This is a target, not a claim of certification.

Shipped in this pass: `:focus-visible` global outline, command palette keyboard nav (arrows/enter/esc), search/help aria-labels, status chips with text + icon, scan progress `aria-label`, findings table checkboxes labeled.

Gaps: no full screen-reader pass, tables not virtualized with row roving tabindex, dialogs mixed MUI defaults, contrast on some nebula chips needs a dedicated AA sweep, no skip-link inside the authenticated shell (docs hub has one).
