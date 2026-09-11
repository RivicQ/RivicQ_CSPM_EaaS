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
  visual,
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
          bgcolor: creative ? '#0a0a0f' : 'background.paper',
          backgroundImage: 'none',
          boxShadow: 'none',
        }}
      >
        <Box sx={{ p: { xs: 2, md: 2.5 }, position: 'relative', zIndex: 1 }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            spacing={2}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
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
        {visual && (
          <Box
            sx={{
              mx: { xs: 1.5, md: 2 },
              mb: { xs: 1.5, md: 2 },
              px: 1.75,
              py: 1.5,
              borderRadius: 2,
              bgcolor: '#000000',
              border: '1px solid #1f1f2e',
              backgroundImage: 'none',
              minHeight: 120,
            }}
          >
            {visual}
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
};

export default PageFrame;
