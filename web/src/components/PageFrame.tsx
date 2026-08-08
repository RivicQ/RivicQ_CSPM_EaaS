import React from 'react';
import { Box, Chip, Stack, Typography, useTheme } from '@mui/material';

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
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: isDark
            ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, #1e293b 60%, #0f172a 100%)`
            : `linear-gradient(135deg, #ffffff 0%, #eef2ff 55%, #f0fdf4 100%)`,
          border: 1,
          borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.14)',
          borderRadius: 3,
          boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.35)' : '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px rgba(79,70,229,0.08)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            right: -40,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: isDark ? 'radial-gradient(circle, rgba(129,140,248,0.18), transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.14), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ p: { xs: 2.5, md: 3.25 }, position: 'relative' }}>
          <Stack spacing={1.5}>
            {eyebrow && (
              <Typography
                variant="overline"
                sx={{ letterSpacing: 3, color: 'primary.main', fontWeight: 700 }}
              >
                {eyebrow}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 880 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                {badge && (
                  <Chip
                    label={badge}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                )}
                {secondaryAction}
                {action}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>
      {children}
    </Box>
  );
};

export default PageFrame;
