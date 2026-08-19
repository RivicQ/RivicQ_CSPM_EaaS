import { Theme } from '@mui/material/styles';
import dashboardDesign from './dashboardDesign';
import { tokens } from './tokens';

/** Central chart & data-viz palette — RivicQ navy/blue + semantic crypto severity only */
export const chartTheme = {
  series: [
    tokens.colors.rivicq[600],
    tokens.colors.rivicq[500],
    tokens.colors.rivicq[400],
    tokens.colors.rivicq[800],
    tokens.colors.rivicq[700],
    tokens.colors.brand.blue,
  ] as const,
  categories: {
    cryptographic: tokens.colors.rivicq[600],
    ai: tokens.colors.rivicq[500],
    hardware: tokens.colors.gold[500],
    software: tokens.colors.crypto.low,
    infrastructure: tokens.colors.rivicq[800],
  } as Record<string, string>,
  providers: {
    aws: tokens.colors.rivicq[700],
    azure: tokens.colors.rivicq[500],
    gcp: tokens.colors.rivicq[400],
    ibm: tokens.colors.rivicq[800],
    ibm_cloud: tokens.colors.rivicq[800],
    kubernetes: tokens.colors.rivicq[600],
    k8s: tokens.colors.rivicq[600],
  } as Record<string, string>,
  pqc: tokens.colors.crypto.low,
  legacy: tokens.colors.crypto.high,
  live: tokens.colors.crypto.low,
  accent: tokens.colors.rivicq[500],
  accentLight: tokens.colors.rivicq[400],
  accentDark: tokens.colors.rivicq[700],
  barGradient: dashboardDesign.chart.barGradient,
  barGradientAlt: dashboardDesign.chart.barGradientAlt,
  severity: dashboardDesign.severity,
  quickActions: [
    tokens.colors.rivicq[600],
    tokens.colors.rivicq[500],
    tokens.colors.rivicq[700],
    tokens.colors.crypto.high,
    tokens.colors.rivicq[800],
    tokens.colors.gold[500],
  ] as const,
} as const;

export const seriesColor = (index: number) =>
  chartTheme.series[index % chartTheme.series.length];

export const categoryColor = (name: string, index = 0) =>
  chartTheme.categories[name.toLowerCase()] ?? seriesColor(index);

export const providerColor = (name: string) => {
  const key = name.toLowerCase().replace(/\s+/g, '');
  return chartTheme.providers[key] ?? tokens.colors.rivicq[500];
};

export const chartGridStroke = (theme: Theme) =>
  theme.palette.mode === 'dark'
    ? dashboardDesign.chart.gridDark
    : dashboardDesign.chart.grid;

export const chartTickFill = (theme: Theme) => theme.palette.text.secondary;

export const chartCursorFill = (theme: Theme) =>
  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(90,82,104,0.05)';

export default chartTheme;
