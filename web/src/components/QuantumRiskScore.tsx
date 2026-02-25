import React from 'react';
import { Box, Typography, Tooltip, LinearProgress } from '@mui/material';

interface QuantumRiskScoreProps {
  score: number; // 0–100 (100 = maximally vulnerable)
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showBar?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#ef4444'; // critical
  if (score >= 60) return '#f97316'; // high
  if (score >= 40) return '#f59e0b'; // medium
  if (score >= 20) return '#84cc16'; // low
  return '#10b981'; // safe
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Quantum-Safe';
}

const SIZE_MAP = { small: 40, medium: 56, large: 72 };
const FONT_MAP = { small: '0.8rem', medium: '1rem', large: '1.4rem' };

export const QuantumRiskScore: React.FC<QuantumRiskScoreProps> = ({
  score,
  size = 'medium',
  showLabel = true,
  showBar = false,
}) => {
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const dim = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];

  return (
    <Tooltip title={`Quantum Risk Score: ${score}/100 — ${label}`}>
      <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: dim,
            height: dim,
            borderRadius: '50%',
            border: `3px solid ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}15`,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color, fontSize, lineHeight: 1 }}
          >
            {score}
          </Typography>
        </Box>
        {showLabel && (
          <Typography variant="caption" sx={{ color, fontWeight: 600, fontSize: '0.65rem' }}>
            {label}
          </Typography>
        )}
        {showBar && (
          <LinearProgress
            variant="determinate"
            value={score}
            sx={{
              width: dim,
              height: 4,
              borderRadius: 2,
              backgroundColor: `${color}20`,
              '& .MuiLinearProgress-bar': { backgroundColor: color },
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
};

export default QuantumRiskScore;
