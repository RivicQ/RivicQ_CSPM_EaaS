import React from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { tokens } from '../theme/tokens';

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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card
        sx={{
          background: `linear-gradient(135deg, ${tokens.colors.surface[0]} 0%, ${tokens.colors.surface[1]} 55%, #122036 100%)`,
          color: 'white',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2}>
            {eyebrow && (
              <Typography variant="overline" sx={{ letterSpacing: 3, color: tokens.colors.rivicq[200] }}>
                {eyebrow}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.72)', mt: 1, maxWidth: 880 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                {badge && <Chip label={badge} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />}
                {secondaryAction}
                {action}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      {children}
    </Box>
  );
};

export default PageFrame;
