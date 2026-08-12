import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import { chartTheme } from '../../theme/chartTheme';
import designSystem, {
  commandCenterCardSx,
  commandCenterEyebrowSx,
  commandCenterTitleSx,
} from '../../theme/designSystem';
import LiveScanMetrics, { LiveScanMetric } from './LiveScanMetrics';
import BrandLogo from '../BrandLogo';

type DashboardHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  liveScanMetrics?: LiveScanMetric[];
};

const DashboardHero: React.FC<DashboardHeroProps> = ({
  eyebrow,
  title,
  subtitle,
  action,
  meta,
  children,
  liveScanMetrics,
}) => {
  const blue = designSystem.proBlue;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        ...commandCenterCardSx,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: `${dashboardDesign.radius.xl}px`,
        mb: dashboardDesign.layout.sectionGap,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: blue.commandGlow,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ position: 'relative', p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr auto' },
            gap: { xs: 2, md: 2.5, lg: 3 },
            alignItems: { lg: 'center' },
            pb: liveScanMetrics?.length ? { xs: 2, md: 2.5 } : 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.25 }}
            >
              <BrandLogo dark sizeKey="default" compact animated />
              <Box
                sx={{
                  width: '1px',
                  height: 20,
                  bgcolor: 'rgba(255,255,255,0.18)',
                  flexShrink: 0,
                  display: { xs: 'none', sm: 'block' },
                }}
              />
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={commandCenterEyebrowSx}>{eyebrow}</Typography>
                <Chip
                  label="Live"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    bgcolor: `${chartTheme.live}33`,
                    color: chartTheme.live,
                    border: 1,
                    borderColor: `${chartTheme.live}55`,
                  }}
                />
              </Stack>
            </Stack>
            <Typography
              variant="h4"
              sx={{
                ...commandCenterTitleSx,
                mb: 1,
                fontSize: { xs: '1.375rem', sm: '1.5rem', md: '1.625rem' },
                lineHeight: 1.15,
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                color: blue.textSecondary,
                maxWidth: 560,
                lineHeight: 1.65,
                fontSize: { xs: '0.875rem', md: '0.9375rem' },
              }}
            >
              {subtitle}
            </Typography>
            {meta && <Box sx={{ mt: 1.75 }}>{meta}</Box>}
          </Box>

          {(children || action) && (
            <Stack
              direction={{ xs: 'row', sm: 'row' }}
              spacing={2}
              alignItems="center"
              justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}
              flexWrap="wrap"
              useFlexGap
              sx={{ flexShrink: 0 }}
            >
              {children && (
                <Box
                  sx={{
                    flexShrink: 0,
                    p: { xs: 1.25, md: 1.5 },
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${blue.border}`,
                  }}
                >
                  {children}
                </Box>
              )}
              {action && (
                <Box sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
                  {action}
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {liveScanMetrics && liveScanMetrics.length > 0 && (
          <Box sx={{ pt: { xs: 2, md: 2.5 }, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: blue.textMuted,
                mb: 1.25,
              }}
            >
              Live scan activity · system-wide
            </Typography>
            <LiveScanMetrics metrics={liveScanMetrics} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DashboardHero;
