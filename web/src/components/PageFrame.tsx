import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { archifyEyebrowSx, archifyTitleSx, nebulaChipSx } from '../theme/nebulaSurfaces';
import { PRISM, prismPalette } from '../theme/prism';

type PageFrameProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  breadcrumbs?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: string | number;
};

const PageFrame: React.FC<PageFrameProps> = ({
  eyebrow,
  title,
  subtitle,
  badge,
  breadcrumbs,
  action,
  secondaryAction,
  children,
  maxWidth = PRISM.grid.maxWidth,
}) => {
  const theme = useTheme();
  const prism = prismPalette(theme.palette.mode);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: PRISM.spacing(2),
        width: '100%',
        maxWidth,
        mx: 'auto',
        color: prism.text,
      }}
    >
      <Box
        sx={{
          gridColumn: '1 / -1',
          flex: '0 0 auto',
          pb: 1,
          borderBottom: `1px solid ${prism.border}`,
        }}
      >
        {breadcrumbs && (
          <Box sx={{ mb: 0.75, color: prism.textMuted, fontSize: '0.6875rem' }}>
            {breadcrumbs}
          </Box>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.25 }}>
              {eyebrow && (
                <Typography sx={archifyEyebrowSx}>{eyebrow}</Typography>
              )}
              {badge && (
                <Box
                  sx={{
                    ...nebulaChipSx,
                    px: 0.75,
                    py: 0.1,
                    lineHeight: 1.4,
                  }}
                >
                  {badge}
                </Box>
              )}
            </Stack>
            <Typography
              component="h1"
              sx={{
                ...archifyTitleSx,
                fontSize: { xs: '1.05rem', md: '1.15rem' },
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                sx={{
                  color: prism.textMuted,
                  mt: 0.25,
                  maxWidth: 760,
                  lineHeight: 1.4,
                  fontSize: '0.75rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {(action || secondaryAction) && (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}>
              {secondaryAction}
              {action}
            </Stack>
          )}
        </Stack>
      </Box>
      <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>{children}</Box>
    </Box>
  );
};

export default PageFrame;
