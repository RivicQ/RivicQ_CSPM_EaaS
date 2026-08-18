import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { CheckCircle, ErrorOutline, HourglassEmpty } from '@mui/icons-material';
import dashboardDesign from '../../theme/dashboardDesign';
import { tokens } from '../../theme/tokens';

type ScanEvent = {
  id: string;
  target: string;
  status: 'completed' | 'running' | 'failed';
  time: string;
  findings?: number;
};

type ScanActivityTimelineProps = {
  events: ScanEvent[];
  onSelect?: (id: string) => void;
};

const statusConfig = {
  completed: { icon: <CheckCircle sx={{ fontSize: 16 }} />, color: dashboardDesign.severity.low, label: 'Completed' },
  running: { icon: <HourglassEmpty sx={{ fontSize: 16 }} />, color: tokens.colors.rivicq[500], label: 'Running' },
  failed: { icon: <ErrorOutline sx={{ fontSize: 16 }} />, color: dashboardDesign.severity.critical, label: 'Failed' },
};

const ScanActivityTimeline: React.FC<ScanActivityTimelineProps> = ({ events, onSelect }) => {
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative', pl: 2.5 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 7,
          top: 8,
          bottom: 8,
          width: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)',
          borderRadius: 1,
        }}
      />
      {events.map((evt) => {
        const cfg = statusConfig[evt.status];
        return (
          <Box key={evt.id} onClick={() => onSelect?.(evt.id)} sx={{ position: 'relative', pb: 2, '&:last-child': { pb: 0 }, cursor: onSelect ? 'pointer' : 'default' }}>
            <Box
              sx={{
                position: 'absolute',
                left: -19,
                top: 2,
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: 'background.paper',
                border: 2,
                borderColor: cfg.color,
                display: 'grid',
                placeItems: 'center',
                color: cfg.color,
              }}
            >
              {cfg.icon}
            </Box>
            <Box sx={{ ml: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{evt.target}</Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontWeight: 500 }}>{evt.time}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                <Typography sx={{ fontSize: '0.6875rem', color: cfg.color, fontWeight: 600 }}>{cfg.label}</Typography>
                {evt.findings != null && (
                  <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                    · {evt.findings} findings
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ScanActivityTimeline;
