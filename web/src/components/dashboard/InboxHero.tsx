import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { motion, useReducedMotion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import { tokens } from '../../theme/tokens';

type QueueItem = {
  id: string;
  title: string;
  severity: string;
  resource?: string;
};

type InboxHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  openCount: number;
  criticalCount: number;
  posture: number;
  items: QueueItem[];
  onOpenQueue?: () => void;
  onSelectItem?: (id: string) => void;
  action?: React.ReactNode;
  meta?: React.ReactNode;
};

const InboxHero: React.FC<InboxHeroProps> = ({
  eyebrow,
  title,
  subtitle,
  openCount,
  criticalCount,
  posture,
  items,
  onOpenQueue,
  onSelectItem,
  action,
  meta,
}) => {
  const reduce = useReducedMotion();
  return (
    <Box
      component={motion.div}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: `${dashboardDesign.radius.sm}px`,
        mb: dashboardDesign.layout.sectionGap,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 280px' },
        }}
      >
        <Box sx={{ p: { xs: 1.25, md: 1.5 }, borderRight: { lg: '1px solid' }, borderColor: { lg: 'divider' } }}>
          <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {eyebrow}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: { xs: '1.05rem', md: '1.15rem' }, mt: 0.25, color: 'text.primary' }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.35, maxWidth: 640, fontSize: '0.75rem', lineHeight: 1.4 }}>{subtitle}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${openCount} open`} color="primary" variant="outlined" />
            <Chip size="small" label={`${criticalCount} critical`} color={criticalCount > 0 ? 'error' : 'default'} />
            <Chip size="small" label={`Posture ${posture}`} />
          </Stack>
          {meta && <Box sx={{ mt: 1.5 }}>{meta}</Box>}
          {action && <Box sx={{ mt: 2 }}>{action}</Box>}
        </Box>
        <Box sx={{ bgcolor: 'background.default' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
              Today’s queue
            </Typography>
            <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} onClick={onOpenQueue}>
              All findings
            </Button>
          </Stack>
          {(items.length ? items : [{ id: 'empty', title: 'No open findings in this workspace', severity: 'INFO' }]).map((item) => (
            <Box
              key={item.id}
              onClick={() => item.id !== 'empty' && onSelectItem?.(item.id)}
              sx={{
                px: 2,
                py: 1.15,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: item.id === 'empty' ? 'default' : 'pointer',
                '&:hover': item.id === 'empty' ? undefined : { bgcolor: 'action.hover' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 0 }} noWrap>{item.title}</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                  {item.severity}
                </Typography>
              </Stack>
              {item.resource && (
                <Typography sx={{ fontFamily: tokens.typography.mono, fontSize: 11, color: 'text.secondary' }}>
                  {item.resource}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default InboxHero;
