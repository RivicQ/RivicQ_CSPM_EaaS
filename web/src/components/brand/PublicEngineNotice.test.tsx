import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import PublicEngineNotice from './PublicEngineNotice';
import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_IBM_PAGES,
  PUBLIC_ENGINE_SCAN_COPY,
  PUBLIC_ENGINE_STATIC_COPY,
} from '../../data/publicInfrastructure';

const mockAuthValue: any = {};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

type Variant = 'scan' | 'ibm' | 'auth';

const renderNotice = (variant?: Variant, compact = false) =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <MemoryRouter>
        <PublicEngineNotice variant={variant} compact={compact} />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('PublicEngineNotice', () => {
  beforeEach(() => {
    Object.assign(mockAuthValue, { backendReachable: false, isDemo: false });
  });

  it('renders the auth variant from canonical static copy', () => {
    renderNotice('auth', true);

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_DISCONNECTED)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_STATIC_COPY)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try the interactive demo \(sample data\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Request Enterprise demo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Deploy the engine/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Operator workflow/i })).not.toBeInTheDocument();
  });

  it('keeps the scan and ibm variants', () => {
    const view = renderNotice('scan');
    expect(screen.getByText(PUBLIC_ENGINE_SCAN_COPY)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Operator workflow/i })).toBeInTheDocument();
    view.unmount();

    renderNotice('ibm');
    expect(screen.getByText(PUBLIC_ENGINE_IBM_PAGES)).toBeInTheDocument();
  });

  it('renders the shared demo state instead of static copy', () => {
    Object.assign(mockAuthValue, { isDemo: true });
    renderNotice('auth');

    expect(screen.getByText(PUBLIC_ENGINE_CHIP_DEMO)).toBeInTheDocument();
    expect(screen.getByText(PUBLIC_ENGINE_DEMO_COPY)).toBeInTheDocument();
    expect(screen.queryByText(PUBLIC_ENGINE_STATIC_COPY)).not.toBeInTheDocument();
  });

  it('stays hidden when an engine is reachable', () => {
    Object.assign(mockAuthValue, { backendReachable: true });
    const { container } = renderNotice('auth');

    expect(container).toBeEmptyDOMElement();
  });
});
