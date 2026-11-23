import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import BetaSignup from './BetaSignup';
import { useAuth } from '../context/AuthContext';
import { platformService } from '../services/api';
import { getAppTheme } from '../theme/theme';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => ({
  platformService: {
    createLead: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const SUCCESS_MESSAGE = 'Request recorded. No beta approval or invitation is implied.';

const renderPage = () =>
  render(
    <ThemeProvider theme={getAppTheme('dark')}>
      <MemoryRouter>
        <BetaSignup />
      </MemoryRouter>
    </ThemeProvider>,
  );

const fillForm = () => {
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Ada Lovelace' } });
  fireEvent.change(screen.getByLabelText(/Work email/), { target: { value: 'ada@example.test' } });
  fireEvent.change(screen.getByLabelText(/Organisation/), { target: { value: 'Analytical Engines' } });
  fireEvent.change(screen.getByLabelText(/Use case/), { target: { value: 'Review the cryptographic inventory' } });
  fireEvent.click(screen.getByLabelText(/I consent to RivicQ storing these details/));
};

describe('BetaSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ backendReachable: true });
    (platformService.createLead as jest.Mock).mockResolvedValue({ data: { id: 'lead-1' } });
  });

  it('records the request through the lead service when the backend is reachable', async () => {
    renderPage();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() =>
      expect(platformService.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ada Lovelace',
          email: 'ada@example.test',
          company: 'Analytical Engines',
          role: 'Security leader',
          useCase: 'Review the cryptographic inventory',
          intent: 'CSPM Community',
          consent: true,
          updates: false,
          source: 'beta-signup',
        }),
      ),
    );
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Labeled product demo' })).toHaveAttribute('href', '/demo');
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
      'href',
      `${process.env.PUBLIC_URL || ''}/docs`,
    );
  });

  it('opens a prefilled mailto and shows no success when the backend is unavailable', () => {
    const originalLocation = window.location;
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: originalLocation.href, assign },
    });
    try {
      mockUseAuth.mockReturnValue({ backendReachable: false });
      renderPage();
      fillForm();

      expect(screen.getByText(/Nothing was submitted to a backend/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Email sales@' }));

      expect(assign).toHaveBeenCalledTimes(1);
      const mailto = assign.mock.calls[0][0] as string;
      expect(mailto).toContain('mailto:sales@rivicq.com?');
      expect(decodeURIComponent(mailto)).toContain('Work email: ada@example.test');
      expect(decodeURIComponent(mailto)).toContain('Interest: CSPM Community');
      expect(decodeURIComponent(mailto)).toContain('Use case: Review the cryptographic inventory');
      expect(screen.getAllByText(/Nothing was submitted to a backend/).length).toBeGreaterThan(0);
      expect(screen.queryByText(SUCCESS_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByText(/Request recorded/i)).not.toBeInTheDocument();
      expect(platformService.createLead).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    }
  });

  it('shows friendly error text without a raw network error', async () => {
    (platformService.createLead as jest.Mock).mockRejectedValue(new Error('Network Error'));
    renderPage();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    expect(await screen.findByText(/could not send your request right now/i)).toBeInTheDocument();
    expect(screen.queryByText('Network Error')).not.toBeInTheDocument();
    expect(screen.queryByText(SUCCESS_MESSAGE)).not.toBeInTheDocument();
  });
});
