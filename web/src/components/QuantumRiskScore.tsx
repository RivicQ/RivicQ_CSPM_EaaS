import React from 'react';
import { Box, Typography, Tooltip, LinearProgress } from '@mui/material';

interface QuantumRiskScoreProps {
  score: number; // 0-100; 100 = highest risk
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

function getRiskColor(score: number): string {
  if (score >= 80) return '#da1e28'; // red – CRITICAL
  if (score >= 60) return '#f97316'; // orange – HIGH
  if (score >= 30) return '#ff832b'; // amber – MEDIUM
  if (score > 0) return '#eab308';   // yellow – LOW
  return '#24a148';                  // green – SAFE
}

function getRiskLabel(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'SAFE';
}

const SIZE_MAP = {
  small: { width: 60, fontSize: '0.65rem' },
  medium: { width: 100, fontSize: '0.75rem' },
  large: { width: 140, fontSize: '0.875rem' },
};

const QuantumRiskScore: React.FC<QuantumRiskScoreProps> = ({
  score,
  size = 'medium',
  showLabel = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getRiskColor(clampedScore);
  const label = getRiskLabel(clampedScore);
  const { width, fontSize } = SIZE_MAP[size];

  return (
    <Tooltip title={`Quantum risk score: ${clampedScore}/100 (${label})`}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={0.25} width={width}>
        {showLabel && (
          <Typography variant="caption" style={{ fontSize, fontWeight: 600, color }}>
            {label}
          </Typography>
        )}
        <LinearProgress
          variant="determinate"
          value={clampedScore}
          style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: '#e5e7eb' }}
          sx={{ '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 } }}
        />
        <Typography variant="caption" style={{ fontSize: fontSize, color: '#6b7280' }}>
          {clampedScore}/100
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default QuantumRiskScore;
