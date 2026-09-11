/** rivicq.com nebula CTAs — never inherit cream/terracotta from an older theme. */
export const websiteCtaSx = {
  borderRadius: 999,
  bgcolor: '#7c3aed !important',
  color: '#ffffff !important',
  boxShadow: 'none',
  '&:hover': { bgcolor: '#6d28d9 !important', boxShadow: 'none' },
} as const;

export const websiteOutlineCtaSx = {
  borderRadius: 999,
  color: '#ffffff !important',
  borderColor: 'rgba(255,255,255,0.45) !important',
  '&:hover': { borderColor: '#ffffff !important', bgcolor: 'rgba(124,58,237,0.16) !important' },
} as const;
