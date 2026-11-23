import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import ScanWorkflowStrip from './ScanWorkflowStrip';
import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_CHIP_LIVE,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_SCAN_COPY,
} from '../../data/publicInfrastructure';

const mockAuthValue: any = {};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

const renderStrip = () =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <ScanWorkflowStrip />
    </ThemeProvider>
  );

describe('ScanWorkflowStrip engine legend', () => {
  it('uses the canonical live chip when an engine is reachable', () => {
    Object.assign(mockAuthValue, { backendReachable: true, isDemo: false });
    renderStrip();

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_LIVE)).toBeInTheDocument();
  });

  it('uses the canonical demo chip and copy in a demo session', () => {
    Object.assign(mockAuthValue, { backendReachable: false, isDemo: true });
    renderStrip();

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_DEMO)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_DEMO_COPY)).toBeInTheDocument();
  });

  it('uses the canonical disconnected chip and scan copy on static Pages', () => {
    Object.assign(mockAuthValue, { backendReachable: false, isDemo: false });
    renderStrip();

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_DISCONNECTED)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_SCAN_COPY)).toBeInTheDocument();
  });
});
