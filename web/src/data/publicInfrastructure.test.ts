import {
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_IBM_COPY,
  PUBLIC_ENGINE_SCAN_COPY,
  PUBLIC_PAGES_SALES_FORM,
} from './publicInfrastructure';

describe('public infrastructure copy', () => {
  it('refuses fabricated public scans', () => {
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/RivicQ CBOM engine/i);
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/never show fabricated findings/i);
    expect(PUBLIC_ENGINE_CHIP_DISCONNECTED).toBe('Needs the RivicQ engine');
  });

  it('refuses fabricated IBM Partner Plus state', () => {
    expect(PUBLIC_ENGINE_IBM_COPY).toMatch(/No fabricated co-sell records/);
    expect(PUBLIC_ENGINE_IBM_COPY).toMatch(/not IBM Quantum hardware/);
    expect(PUBLIC_ENGINE_IBM_COPY).toMatch(/GitHub Pages cannot load live readiness state/);
  });

  it('keeps GitHub Pages demo requests as a sales mailto', () => {
    expect(PUBLIC_PAGES_SALES_FORM).toBe('GitHub Pages has no live API. This form opens a mail to sales@rivicq.com.');
  });
});
