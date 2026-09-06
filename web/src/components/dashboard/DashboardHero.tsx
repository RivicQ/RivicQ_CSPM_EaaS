import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import OperatorRail from '../home/OperatorRail';
import { useNavigate } from 'react-router-dom';
import LiveScanMetrics, { LiveScanMetric } from './LiveScanMetrics';

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
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [step, setStep] = React.useState(1);
  return (
    <Box
      component={motion.div}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: `${dashboardDesign.radius.md}px`,
        mb: dashboardDesign.layout.sectionGap,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {eyebrow}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 650, letterSpacing: '-0.03em', fontSize: { xs: '1.35rem', md: '1.75rem' }, mt: 0.5 }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1, maxWidth: 680 }}>{subtitle}</Typography>
          {meta && <Box sx={{ mt: 1.5 }}>{meta}</Box>}
          <Box sx={{ mt: 2 }}>
            <OperatorRail
              active={step}
              onChange={(i) => {
                setStep(i);
                if (i === 0) navigate('/scanner');
                if (i === 2) navigate('/scanner');
                if (i === 3) navigate('/analytics');
              }}
            />
          </Box>
        </Box>
        <Stack spacing={1.5} alignItems="flex-end" sx={{ minWidth: { lg: 200 } }}>
          {children}
          {action}
        </Stack>
      </Stack>
      {liveScanMetrics && liveScanMetrics.length > 0 && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Chip label="Live scan activity" size="small" sx={{ mb: 1.25 }} />
          <LiveScanMetrics metrics={liveScanMetrics} />
        </Box>
      )}
    </Box>
  );
};

export default DashboardHero;
