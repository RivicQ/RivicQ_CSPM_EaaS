import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ArchifySurface from './ArchifySurface';

describe('ArchifySurface console backdrop', () => {
  it('renders a decorative, non-interactive console backdrop', () => {
    render(<ArchifySurface placement="backdrop" variant="console" />);
    const backdrop = screen.getByTestId('archify-surface-backdrop');

    expect(backdrop).toHaveAttribute('data-variant', 'console');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByTestId('archify-surface-rail')).not.toBeInTheDocument();
  });
});
