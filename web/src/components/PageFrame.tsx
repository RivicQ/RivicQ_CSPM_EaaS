import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ARCHIFY_FONTS, NEBULA, nebulaPanelSx } from '../theme/nebulaSurfaces';

type PageFrameProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
};

const PageFrame: React.FC<PageFrameProps> = ({
  eyebrow,
  title,
  subtitle,
  badge,
  action,
  secondaryAction,
  children,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Box
      sx={{
        ...nebulaPanelSx,
        flex: '0 0 auto',
        p: { xs: 1.25, md: 1.5 },
        borderRadius: '12px',
        bgcolor: `${NEBULA.panel} !important`,
        backgroundImage: 'none !important',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
            {eyebrow && (
              <Typography
                sx={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: NEBULA.faint,
                }}
              >
                {eyebrow}
              </Typography>
            )}
            {badge && (
              <Box
                sx={{
                  px: 0.75,
                  py: 0.15,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'rgba(255,255,255,0.16)',
                  bgcolor: 'transparent',
                  color: NEBULA.muted,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {badge}
              </Box>
            )}
          </Stack>
          <Typography
            component="h1"
            sx={{
              fontFamily: ARCHIFY_FONTS.title,
              fontWeight: 500,
              fontSize: { xs: '1.25rem', md: '1.45rem' },
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              color: NEBULA.text,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: NEBULA.muted,
                mt: 0.5,
                maxWidth: 720,
                lineHeight: 1.45,
                fontSize: '0.8125rem',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {(action || secondaryAction) && (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}>
            {secondaryAction}
            {action}
          </Stack>
        )}
      </Stack>
    </Box>
    {children}
  </Box>
);

export default PageFrame;
