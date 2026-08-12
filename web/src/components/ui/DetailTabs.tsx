import React from 'react';
import { Box, Tab, Tabs, useTheme } from '@mui/material';
import designSystem from '../../theme/designSystem';

type DetailTabsProps = {
  value: number;
  onChange: (value: number) => void;
  tabs: { label: string; icon?: React.ReactElement }[];
};

export const DetailTabs: React.FC<DetailTabsProps> = ({ value, onChange, tabs }) => {
  const theme = useTheme();
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        minHeight: 44,
        mb: 0.5,
        '& .MuiTab-root': {
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: 'text.secondary',
          borderRadius: `${designSystem.radius.sm}px`,
          mx: 0.25,
          '&.Mui-selected': { color: 'primary.main' },
        },
        '& .MuiTabs-indicator': {
          height: 3,
          borderRadius: 2,
          bgcolor: 'primary.main',
        },
        borderBottom: 1,
        borderColor: theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
      }}
    >
      {tabs.map((tab) => (
        <Tab key={tab.label} label={tab.label} icon={tab.icon} iconPosition="start" />
      ))}
    </Tabs>
  );
};

type TabPanelProps = {
  value: number;
  index: number;
  children: React.ReactNode;
};

export const TabPanel: React.FC<TabPanelProps> = ({ value, index, children }) => {
  if (value !== index) return null;
  return (
    <Box role="tabpanel" sx={{ pt: 2.5 }}>
      {children}
    </Box>
  );
};

export default DetailTabs;
