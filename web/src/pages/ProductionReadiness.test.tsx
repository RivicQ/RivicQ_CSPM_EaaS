import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import ProductionReadiness from './ProductionReadiness';
import { useAuth } from '../context/AuthContext';
import { getProductionReadiness } from '../services/readiness';
import { getAppTheme } from '../theme/theme';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/readiness', () => {
  const actual = jest.requireActual('../services/readiness');
  return {
    ...actual,
    getProductionReadiness: jest.fn(),
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockGetReadiness = getProductionReadiness as jest.Mock;

const validPayload = {
  checked_at: '2026-11-23T10:00:00Z',
  overall: 'partial',
  groups: [
    {
      id: 'core',
      label: 'Core services',
      checks: [
        {
          id: 'api',
          label: 'Backend API',
          status: 'Production implemented',
          detail: 'Authenticated admin endpoint is implemented.',
          source: 'docs/PRODUCT_STATUS.md',
        },
        {
          id: 'email',
          label: 'Email delivery',
          status: 'Integration pending',
          detail: 'No mail sender is configured.',
          source: 'docs/EAAS_LIMITATIONS.md',
        },
      ],
    },
  ],
  sources: ['docs/PRODUCT_STATUS.md', 'docs/EAAS_LIMITATIONS.md'],
};

const authValue = {
  user: {
    id: 'user-1',
    name: 'Ada',
    email: 'ada@example.test',
    role: 'admin',
    edition: 'enterprise',
  },
  token: 'token-1',
  edition: 'enterprise',
  backendReachable: true,
};

const renderPage = () =>
  render(
    <ThemeProvider theme={getAppTheme('dark')}>
      <MemoryRouter>
        <ProductionReadiness />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('ProductionReadiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(authValue);
    mockGetReadiness.mockResolvedValue(validPayload);
  });

  it('shows an honest empty state when no authoritative backend is connected', () => {
    mockUseAuth.mockReturnValue({ ...authValue, backendReachable: false });

    renderPage();

    expect(
      screen.getByText('No authoritative backend is connected; readiness cannot be evaluated.'),
    ).toBeInTheDocument();
    expect(mockGetReadiness).not.toHaveBeenCalled();
    expect(screen.queryByText('Core services')).not.toBeInTheDocument();
    expect(screen.queryByText(/Checked at:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Overall:/)).not.toBeInTheDocument();
  });

  it('shows a loading state while the admin request is pending', () => {
    mockGetReadiness.mockImplementation(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByText(/Loading production readiness/)).toBeInTheDocument();
    expect(screen.queryByText('Core services')).not.toBeInTheDocument();
  });

  it('renders server-reported groups, checks, metadata and maturity legend', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Production readiness' })).toBeInTheDocument();
    expect(await screen.findByText('Core services')).toBeInTheDocument();
    expect(screen.getByText('Overall: Partial')).toBeInTheDocument();
    expect(screen.getByText('Checked at: 2026-11-23T10:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('docs/PRODUCT_STATUS.md')).toBeInTheDocument();
    expect(screen.getByText('docs/EAAS_LIMITATIONS.md')).toBeInTheDocument();
    expect(screen.getByText('Core services')).toBeInTheDocument();
    expect(screen.getByText('Backend API')).toBeInTheDocument();
    expect(screen.getByText('Email delivery')).toBeInTheDocument();
    expect(screen.getByText('Authenticated admin endpoint is implemented.')).toBeInTheDocument();
    expect(
      screen.getByText('Configuration-only assessment; no live cloud, quantum or hardware probes were performed.'),
    ).toBeInTheDocument();
    [
      'Production implemented',
      'Beta implemented',
      'Experimental',
      'Integration pending',
      'Planned',
      'Not supported',
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it('renders backend readiness states and maturity labels alongside map-shaped sources', async () => {
    mockGetReadiness.mockResolvedValue({
      checked_at: '2026-11-23T11:00:00Z',
      overall: 'not-ready',
      groups: [
        {
          id: 'hardware',
          label: 'Hardware',
          status: 'not-ready',
          checks: [
            {
              id: 'hardware.wireless',
              label: 'Wireless operations',
              status: 'not-supported',
              detail: 'No wireless route or operation exists.',
              source: 'none',
              maturity: 'Not supported',
            },
          ],
        },
      ],
      sources: { none: 'not-applicable' },
    });

    renderPage();

    expect(await screen.findByText('Wireless operations')).toBeInTheDocument();
    expect(screen.getByText('Overall: Not ready')).toBeInTheDocument();
    expect(screen.getByText('1 check(s) · Not ready')).toBeInTheDocument();
    expect(screen.getByText('none: not-applicable')).toBeInTheDocument();
    expect(screen.getAllByText('Not supported').length).toBeGreaterThan(0);
  });

  it('shows a friendly error and retries the request', async () => {
    mockGetReadiness
      .mockRejectedValueOnce(new Error('Cannot reach the authoritative backend. Check connectivity and try again.'))
      .mockResolvedValueOnce(validPayload);

    renderPage();

    expect(
      await screen.findByText('Cannot reach the authoritative backend. Check connectivity and try again.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Core services')).toBeInTheDocument();
    await waitFor(() => expect(mockGetReadiness).toHaveBeenCalledTimes(2));
  });

  it('does not fabricate checks when the API returns empty lists', async () => {
    mockGetReadiness.mockResolvedValue({ ...validPayload, groups: [], sources: [] });

    renderPage();

    expect(await screen.findByText('The readiness service returned no checks.')).toBeInTheDocument();
    expect(screen.getByText('No evidence sources were reported.')).toBeInTheDocument();
    expect(screen.queryByText('Core services')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend API')).not.toBeInTheDocument();
  });

  it('does not render fake data when the API returns an invalid payload', async () => {
    mockGetReadiness.mockResolvedValue({});

    renderPage();

    expect(await screen.findByText('The readiness service returned an invalid response.')).toBeInTheDocument();
    expect(screen.queryByText('Overall: Partial')).not.toBeInTheDocument();
    expect(screen.queryByText('Core services')).not.toBeInTheDocument();
  });
});
