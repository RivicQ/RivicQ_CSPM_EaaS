/** Primary CTA. Violet fill and a white label in Nebula and Day. */
export const websiteCtaSx = {
  borderRadius: 999,
  bgcolor: 'var(--rq-btn-bg, #7c3aed) !important',
  backgroundImage: 'none !important',
  color: 'var(--rq-btn-fg, #ffffff) !important',
  WebkitTextFillColor: 'var(--rq-btn-fg, #ffffff)',
  boxShadow: 'none',
  '& span, & .MuiButton-startIcon, & .MuiButton-endIcon': {
    color: 'inherit !important',
    WebkitTextFillColor: 'inherit',
  },
  '&:hover': {
    bgcolor: 'var(--rq-btn-bg-hover, #6d28d9) !important',
    backgroundImage: 'none !important',
    color: 'var(--rq-btn-fg, #ffffff) !important',
    WebkitTextFillColor: 'var(--rq-btn-fg, #ffffff)',
    boxShadow: 'none',
  },
} as const;

/** Outline CTA — ink on the archive surface, in both palettes. */
export const websiteOutlineCtaSx = (_isDark: boolean) => ({
  borderRadius: 999,
  color: 'var(--rq-text) !important',
  WebkitTextFillColor: 'var(--rq-text)',
  borderColor: 'var(--rq-line) !important',
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  '&:hover': {
    borderColor: 'var(--rq-accent) !important',
    bgcolor: 'var(--rq-nav-hover) !important',
    color: 'var(--rq-text) !important',
    WebkitTextFillColor: 'var(--rq-text)',
  },
});
