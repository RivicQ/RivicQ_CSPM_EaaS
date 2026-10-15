import {
  PUBLIC_ENGINE_AUTH_COPY,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_ENTERPRISE_AUTH_COPY,
  PUBLIC_ENGINE_IBM_COPY,
  PUBLIC_ENGINE_SCAN_COPY,
  PUBLIC_PAGES_SALES_FORM,
} from './publicInfrastructure';

describe('public infrastructure copy', () => {
  it('refuses fabricated public scans', () => {
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/static build has no CBOM engine/i);
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/labelled sample data only/i);
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/Press Run scan to start the interactive demo/i);
    expect(PUBLIC_ENGINE_CHIP_DISCONNECTED).toBe('Static Pages · no engine');
  });

  it('explains static auth without network-error framing', () => {
    expect(PUBLIC_ENGINE_AUTH_COPY).toMatch(/static and hosts no RivicQ engine/i);
    expect(PUBLIC_ENGINE_AUTH_COPY).not.toMatch(/network issue/i);
    expect(PUBLIC_ENGINE_ENTERPRISE_AUTH_COPY).toMatch(/Enterprise connectors/i);
    expect(PUBLIC_ENGINE_ENTERPRISE_AUTH_COPY).toMatch(/request a licensed Enterprise demo/i);
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
