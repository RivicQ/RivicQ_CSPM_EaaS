import { NEBULA } from './nebulaSurfaces';
import { PRISM } from './prism';

export const websiteCtaSx = {
  borderRadius: 999,
  bgcolor: `${NEBULA.accent} !important`,
  color: `${PRISM.dark.text} !important`,
  boxShadow: 'none',
  '&:hover': { bgcolor: `${PRISM.brand.violet600} !important`, boxShadow: 'none' },
} as const;

export const websiteOutlineCtaSx = (_isDark?: boolean) => ({
  borderRadius: 999,
  color: `${NEBULA.text} !important`,
  borderColor: `${NEBULA.lineHi} !important`,
  '&:hover': {
    borderColor: `${NEBULA.accentSoft} !important`,
    bgcolor: `${NEBULA.raised} !important`,
  },
});
