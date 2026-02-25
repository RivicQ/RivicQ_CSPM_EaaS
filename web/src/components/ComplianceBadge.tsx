import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

type ComplianceStandard = 'FIPS-140-3' | 'BSI-TR-02102' | 'DORA' | 'eIDAS' | 'NIST-PQC' | 'ISO-27001';

interface ComplianceBadgeProps {
  standard: ComplianceStandard;
  compliant: boolean;
  score?: number;
  size?: 'small' | 'medium';
}

const STANDARD_COLORS: Record<ComplianceStandard, string> = {
  'FIPS-140-3': '#3b82f6',
  'BSI-TR-02102': '#10b981',
  'DORA': '#8b5cf6',
  'eIDAS': '#f59e0b',
  'NIST-PQC': '#06b6d4',
  'ISO-27001': '#64748b',
};

export const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({
  standard,
  compliant,
  score,
  size = 'small',
}) => {
  const color = STANDARD_COLORS[standard];
  const label = score !== undefined ? `${standard} ${score}%` : standard;

  return (
    <Chip
      icon={compliant
        ? <CheckCircle sx={{ fontSize: size === 'small' ? 14 : 18, color: '#10b981 !important' }} />
        : <Cancel sx={{ fontSize: size === 'small' ? 14 : 18, color: '#ef4444 !important' }} />}
      label={label}
      size={size}
      sx={{
        color: compliant ? color : '#ef4444',
        borderColor: compliant ? `${color}60` : '#ef444440',
        backgroundColor: compliant ? `${color}12` : '#ef444412',
        border: `1px solid`,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.85rem',
      }}
      variant="outlined"
    />
  );
};

/** Renders a row of compliance badges. */
export const ComplianceBadgeRow: React.FC<{
  standards: Array<{ standard: ComplianceStandard; compliant: boolean; score?: number }>;
  size?: 'small' | 'medium';
}> = ({ standards, size = 'small' }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
    {standards.map((s) => (
      <ComplianceBadge key={s.standard} {...s} size={size} />
    ))}
  </Box>
);

export default ComplianceBadge;
