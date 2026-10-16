import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ARCHIFY_FONTS, NEBULA } from '../theme/nebulaSurfaces';

type PageFrameProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  visual?: React.ReactNode;
  children?: React.ReactNode;
  creative?: boolean;
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
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
    <Box
      sx={{
        flex: '0 0 auto',
        pb: 1,
        borderBottom: '1px solid',
        borderColor: NEBULA.line,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.25 }}>
            {eyebrow && (
              <Typography
                sx={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
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
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: NEBULA.line,
                  color: NEBULA.faint,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
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
              fontSize: { xs: '1.05rem', md: '1.15rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              color: NEBULA.text,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: NEBULA.faint,
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
    {children}
  </Box>
);

export default PageFrame;
