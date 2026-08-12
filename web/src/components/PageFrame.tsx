import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import designSystem, {
  commandCenterCardSx,
  commandCenterEyebrowSx,
  commandCenterTitleSx,
  proBlueActionStackSx,
  proBlueBadgeSx,
} from '../theme/designSystem';

type PageFrameProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
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
  creative = true,
}) => {
  const blue = designSystem.proBlue;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        sx={{
          ...(creative ? commandCenterCardSx : {
            position: 'relative',
            overflow: 'hidden',
            borderRadius: `${designSystem.radius.xl}px`,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }),
          borderRadius: `${designSystem.radius.xl}px`,
        }}
      >
        {creative && (
          <>
            <Box sx={{ position: 'absolute', inset: 0, background: blue.commandGlow, pointerEvents: 'none' }} />
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
          </>
        )}
        <Box sx={{ p: { xs: 2.5, md: 3 }, position: 'relative' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            spacing={2}
          >
            <Box>
              {(eyebrow || badge) && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                  {eyebrow && (
                    <Typography sx={creative ? commandCenterEyebrowSx : { ...commandCenterEyebrowSx, color: 'primary.main' }}>
                      {eyebrow}
                    </Typography>
                  )}
                  {badge && (
                    <Box sx={creative ? proBlueBadgeSx : {
                      ...proBlueBadgeSx,
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                      borderColor: 'divider',
                    }}
                    >
                      {badge}
                    </Box>
                  )}
                </Stack>
              )}
              <Typography
                variant="h4"
                sx={creative ? commandCenterTitleSx : { ...commandCenterTitleSx, color: 'text.primary' }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  sx={{
                    color: creative ? blue.textSecondary : 'text.secondary',
                    mt: 1,
                    maxWidth: 680,
                    lineHeight: 1.65,
                    fontSize: '0.9375rem',
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            {(action || secondaryAction) && (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                alignItems="center"
                sx={{ flexShrink: 0, ...(creative ? proBlueActionStackSx : {}) }}
              >
                {secondaryAction}
                {action}
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>
      {children}
    </Box>
  );
};

export default PageFrame;
