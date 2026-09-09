import React from 'react';
import { Chip } from '@mui/material';
import {
  CheckCircle, Error as ErrorIcon, HourglassEmpty, PlayArrow, HelpOutline,
  WarningAmber, Block, CloudOff, ReportProblem, Done,
} from '@mui/icons-material';
import type { OpsStatus } from '../../ops/findings';

const META: Record<OpsStatus, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: React.ReactNode }> = {
  healthy: { label: 'Healthy', color: 'success', icon: <CheckCircle fontSize="inherit" /> },
  warning: { label: 'Warning', color: 'warning', icon: <WarningAmber fontSize="inherit" /> },
  critical: { label: 'Critical', color: 'error', icon: <ErrorIcon fontSize="inherit" /> },
  unknown: { label: 'Unknown', color: 'default', icon: <HelpOutline fontSize="inherit" /> },
  running: { label: 'Running', color: 'info', icon: <PlayArrow fontSize="inherit" /> },
  pending: { label: 'Pending', color: 'default', icon: <HourglassEmpty fontSize="inherit" /> },
  completed: { label: 'Completed', color: 'success', icon: <Done fontSize="inherit" /> },
  failed: { label: 'Failed', color: 'error', icon: <ErrorIcon fontSize="inherit" /> },
  disabled: { label: 'Disabled', color: 'default', icon: <Block fontSize="inherit" /> },
  disconnected: { label: 'Disconnected', color: 'warning', icon: <CloudOff fontSize="inherit" /> },
  needs_attention: { label: 'Needs attention', color: 'warning', icon: <ReportProblem fontSize="inherit" /> },
};

type Props = { status: OpsStatus; size?: 'small' | 'medium' };

const StatusChip: React.FC<Props> = ({ status, size = 'small' }) => {
  const m = META[status] || META.unknown;
  return (
    <Chip
      size={size}
      icon={m.icon as React.ReactElement}
      label={m.label}
      color={m.color === 'default' ? undefined : m.color}
      variant={m.color === 'default' ? 'outlined' : 'filled'}
      aria-label={`Status: ${m.label}`}
      sx={{ fontWeight: 700, textTransform: 'none' }}
    />
  );
};

export default StatusChip;
