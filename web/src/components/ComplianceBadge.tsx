import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Shield, CheckCircle, Cancel } from '@mui/icons-material';

type ComplianceStandard = 'FIPS-140-3' | 'BSI-TR-02102' | 'DORA' | 'eIDAS' | 'NIST-PQC';

interface ComplianceBadgeProps {
  standard: ComplianceStandard;
  compliant: boolean;
  score?: number; // 0-100
}

const STANDARD_COLORS: Record<ComplianceStandard, { bg: string; text: string }> = {
  'FIPS-140-3':    { bg: '#dbeafe', text: '#1d4ed8' },
  'BSI-TR-02102':  { bg: '#dcfce7', text: '#15803d' },
  'DORA':          { bg: '#fce7f3', text: '#be185d' },
  'eIDAS':         { bg: '#ede9fe', text: '#7c3aed' },
  'NIST-PQC':      { bg: '#fef3c7', text: '#92400e' },
};

const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({
  standard,
  compliant,
  score,
}) => {
  const colors = STANDARD_COLORS[standard];
  const label = score !== undefined ? `${standard} · ${score}%` : standard;

  return (
    <Tooltip
      title={
        compliant
          ? `Compliant with ${standard}${score !== undefined ? ` (${score}%)` : ''}`
          : `Non-compliant with ${standard}`
      }
    >
      <Chip
        size="small"
        icon={
          compliant
            ? <CheckCircle style={{ fontSize: 13, color: colors.text }} />
            : <Cancel style={{ fontSize: 13, color: '#ef4444' }} />
        }
        label={label}
        style={{
          backgroundColor: compliant ? colors.bg : '#fee2e2',
          color: compliant ? colors.text : '#ef4444',
          borderColor: compliant ? colors.text : '#ef4444',
          fontSize: '0.68rem',
          height: 22,
          fontWeight: 600,
        }}
        variant="outlined"
      />
    </Tooltip>
  );
};

export default ComplianceBadge;
