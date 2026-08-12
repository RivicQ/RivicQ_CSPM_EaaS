import React from 'react';
import { Box, Typography } from '@mui/material';
import SeverityBadge from './SeverityBadge';
import dashboardDesign from '../../theme/dashboardDesign';

type Finding = {
  id: string;
  title: string;
  severity: string;
  resource?: string;
  framework?: string;
};

type TopFindingsListProps = {
  findings: Finding[];
  maxItems?: number;
};

const TopFindingsList: React.FC<TopFindingsListProps> = ({ findings, maxItems = 5 }) => (
  <Box>
    {findings.slice(0, maxItems).map((f, i) => (
      <Box
        key={f.id}
        sx={{
          display: 'flex',
          gap: 1.5,
          py: 1.5,
          px: 0.5,
          borderRadius: `${dashboardDesign.radius.sm}px`,
          transition: dashboardDesign.motion.transition,
          '&:hover': { bgcolor: 'action.hover' },
          ...(i < findings.length - 1 && { borderBottom: 1, borderColor: 'divider' }),
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.disabled', minWidth: 20, pt: 0.25 }}>
          {String(i + 1).padStart(2, '0')}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.45, mb: 0.75 }}>
            {f.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <SeverityBadge severity={f.severity} compact />
            {f.resource && (
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{f.resource}</Typography>
            )}
            {f.framework && (
              <Typography sx={{ fontSize: '0.6875rem', color: 'primary.main', fontWeight: 600 }}>{f.framework}</Typography>
            )}
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);

export default TopFindingsList;
