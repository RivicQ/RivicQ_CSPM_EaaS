import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { ArrowForward, Assessment, Cloud, DocumentScanner, FactCheck, GitHub, Radar, Storage, AccountTree } from '@mui/icons-material';
import { motion } from 'framer-motion';
import dashboardDesign from '../../theme/dashboardDesign';
import { chartTheme } from '../../theme/chartTheme';
import { panelTitleSx } from '../../theme/designSystem';
import { tokens } from '../../theme/tokens';

type QuickAction = {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  accent: string;
};

type QuickActionsGridProps = {
  actions: QuickAction[];
  onNavigate: (path: string) => void;
  showHeader?: boolean;
};

const QuickActionCard: React.FC<{
  action: QuickAction;
  index: number;
  onNavigate: (path: string) => void;
}> = ({ action, index, onNavigate }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      component={motion.button}
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => onNavigate(action.path)}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        textAlign: 'left',
        width: '100%',
        px: 1.25,
        py: 0.875,
        border: 1,
        borderColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.1)',
        borderRadius: `${dashboardDesign.radius.md}px`,
        bgcolor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.9)',
        cursor: 'pointer',
        font: 'inherit',
        color: 'inherit',
        transition: dashboardDesign.motion.transition,
        '&:focus-visible': {
          outline: `2px solid ${action.accent}`,
          outlineOffset: 2,
        },
        '&:hover': {
          borderColor: `${action.accent}44`,
          bgcolor: isDark ? 'rgba(8,47,73,0.92)' : '#fff',
          transform: 'none',
          boxShadow: 'none',
          '& .qa-arrow': { opacity: 1 },
          '& .qa-icon': { bgcolor: `${action.accent}20`, color: action.accent },
        },
      }}
    >
      <Box
        className="qa-icon"
        sx={{
          width: 32,
          height: 32,
          borderRadius: `${dashboardDesign.radius.sm}px`,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: `${action.accent}12`,
          color: action.accent,
          transition: dashboardDesign.motion.transition,
          '& svg': { fontSize: 17 },
        }}
      >
        {action.icon}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {action.label}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.6875rem',
            color: 'text.secondary',
            mt: 0.125,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {action.description}
        </Typography>
      </Box>

      <ArrowForward
        className="qa-arrow"
        sx={{
          fontSize: 14,
          color: action.accent,
          opacity: 0.35,
          flexShrink: 0,
          transition: dashboardDesign.motion.transition,
        }}
      />
    </Box>
  );
};

const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ actions, onNavigate, showHeader = true }) => (
  <Box sx={{ mb: dashboardDesign.layout.sectionGap }}>
    {showHeader && (
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
        <Typography sx={{ ...panelTitleSx, fontSize: '0.8125rem' }}>Quick Actions</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
          Jump to key workflows
        </Typography>
      </Box>
    )}

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
          xl: 'repeat(7, minmax(0, 1fr))',
        },
        gap: { xs: 0.875, md: 1 },
      }}
    >
      {actions.map((action, index) => (
        <QuickActionCard key={action.label} action={action} index={index} onNavigate={onNavigate} />
      ))}
    </Box>
  </Box>
);

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { label: 'GitHub Scan', description: 'Real repo analysis', icon: <GitHub />, path: '/scanner?tab=github', accent: tokens.colors.crypto.quantum },
  { label: 'Run Scan', description: 'CBOM discovery', icon: <DocumentScanner />, path: '/scanner', accent: chartTheme.quickActions[0] },
  { label: 'Five-BOM', description: 'QBOM · AIBOM · SBOM · IBOM · CBOM', icon: <AccountTree />, path: '/bom', accent: tokens.colors.rivicq[600] },
  { label: 'Assets', description: 'Crypto inventory', icon: <Storage />, path: '/assets', accent: chartTheme.quickActions[1] },
  { label: 'Analytics', description: 'Trends & reports', icon: <Assessment />, path: '/analytics', accent: chartTheme.quickActions[2] },
  { label: 'CSPM', description: 'Crypto posture', icon: <Radar />, path: '/enterprise/cspm', accent: chartTheme.quickActions[3] },
  { label: 'Compliance', description: 'Framework scores', icon: <FactCheck />, path: '/enterprise/compliance', accent: chartTheme.quickActions[4] },
  { label: 'Cloud', description: 'Multi-cloud posture', icon: <Cloud />, path: '/enterprise/cloud-posture', accent: chartTheme.quickActions[5] },
];

export default QuickActionsGrid;
