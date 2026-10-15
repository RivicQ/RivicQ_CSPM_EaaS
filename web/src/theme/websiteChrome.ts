/** Enterprise primary CTA. Label and fill always contrast in Harbor and Ledger. */
export const websiteCtaSx = {
  borderRadius: 999,
  bgcolor: 'var(--rq-btn-bg, #1e3f36) !important',
  backgroundImage: 'none !important',
  color: 'var(--rq-btn-fg, #f6f1e6) !important',
  WebkitTextFillColor: 'var(--rq-btn-fg, #f6f1e6)',
  boxShadow: 'none',
  '& span, & .MuiButton-startIcon, & .MuiButton-endIcon': {
    color: 'inherit !important',
    WebkitTextFillColor: 'inherit',
  },
  '&:hover': {
    bgcolor: 'var(--rq-btn-bg-hover, #16332c) !important',
    backgroundImage: 'none !important',
    color: 'var(--rq-btn-fg, #f6f1e6) !important',
    WebkitTextFillColor: 'var(--rq-btn-fg, #f6f1e6)',
    boxShadow: 'none',
  },
} as const;

/** Outline CTA — adapts to the surrounding surface so it stays legible in both palettes. */
export const websiteOutlineCtaSx = (isDark: boolean) => ({
  borderRadius: 999,
  color: isDark ? '#F4F7F5 !important' : '#1C1915 !important',
  WebkitTextFillColor: isDark ? '#F4F7F5' : '#1C1915',
  borderColor: isDark ? 'rgba(244,247,245,0.45) !important' : 'rgba(28,25,21,0.35) !important',
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  '&:hover': {
    borderColor: isDark ? '#F4F7F5 !important' : '#1C1915 !important',
    bgcolor: isDark ? 'rgba(228,194,122,0.12) !important' : 'rgba(30,63,54,0.08) !important',
  },
});
