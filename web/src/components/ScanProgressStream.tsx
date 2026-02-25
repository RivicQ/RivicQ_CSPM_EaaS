import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress, Chip, Button } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Stop } from '@mui/icons-material';

interface ScanStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

interface ScanProgressStreamProps {
  jobId?: string;
  steps?: ScanStep[];
  progress?: number; // 0–100
  status?: 'idle' | 'running' | 'completed' | 'failed';
  onCancel?: () => void;
}

const DEFAULT_STEPS: ScanStep[] = [
  { id: 'init', label: 'Initializing scanner', status: 'pending' },
  { id: 'discover', label: 'Discovering crypto assets', status: 'pending' },
  { id: 'analyze', label: 'Analyzing algorithms', status: 'pending' },
  { id: 'quantum', label: 'Running quantum risk assessment', status: 'pending' },
  { id: 'report', label: 'Generating BOM report', status: 'pending' },
];

export const ScanProgressStream: React.FC<ScanProgressStreamProps> = ({
  jobId,
  steps = DEFAULT_STEPS,
  progress = 0,
  status = 'idle',
  onCancel,
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const statusColor = status === 'completed' ? '#10b981'
    : status === 'failed' ? '#ef4444'
    : status === 'running' ? '#667eea'
    : '#6b7280';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Scan Progress
          </Typography>
          {jobId && (
            <Typography variant="caption" color="textSecondary">
              Job #{jobId.slice(0, 8)}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={status}
            size="small"
            sx={{ color: statusColor, borderColor: `${statusColor}60`, backgroundColor: `${statusColor}12`, border: '1px solid', fontWeight: 600, fontSize: '0.7rem' }}
            variant="outlined"
          />
          {status === 'running' && onCancel && (
            <Button size="small" startIcon={<Stop />} onClick={onCancel} color="error" variant="outlined">
              Cancel
            </Button>
          )}
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={animatedProgress}
        sx={{
          mb: 2,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#e2e8f0',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            borderRadius: 4,
            transition: 'transform 0.5s ease',
          },
        }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {steps.map((step) => (
          <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {step.status === 'done' ? (
              <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
            ) : step.status === 'running' ? (
              <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #667eea', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
              </Box>
            ) : step.status === 'error' ? (
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: '10px', color: 'white', lineHeight: 1 }}>!</Typography>
              </Box>
            ) : (
              <RadioButtonUnchecked sx={{ fontSize: 16, color: '#cbd5e1' }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: step.status === 'done' ? '#374151' : step.status === 'running' ? '#667eea' : step.status === 'error' ? '#ef4444' : '#9ca3af',
                fontWeight: step.status === 'running' ? 600 : 400,
              }}
            >
              {step.label}
            </Typography>
            {step.detail && step.status !== 'pending' && (
              <Typography variant="caption" color="textSecondary">
                — {step.detail}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ScanProgressStream;
