/** rivicq.com nebula CTAs — never inherit cream/terracotta from an older theme. */
export const websiteCtaSx = {
  borderRadius: 999,
  bgcolor: '#7c3aed !important',
  color: '#ffffff !important',
  boxShadow: 'none',
  '&:hover': { bgcolor: '#6d28d9 !important', boxShadow: 'none' },
} as const;

/** Outline CTA — adapts to the surrounding surface so it stays legible in light and dark. */
export const websiteOutlineCtaSx = (isDark: boolean) => ({
  borderRadius: 999,
  color: isDark ? '#ffffff !important' : '#0a0a0f !important',
  borderColor: isDark ? 'rgba(255,255,255,0.45) !important' : 'rgba(10,10,15,0.30) !important',
  '&:hover': {
    borderColor: isDark ? '#ffffff !important' : '#0a0a0f !important',
    bgcolor: isDark ? 'rgba(124,58,237,0.16) !important' : 'rgba(124,58,237,0.08) !important',
  },
});
