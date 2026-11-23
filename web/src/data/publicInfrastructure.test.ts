import {
  PUBLIC_ENGINE_CHIP_DEMO,
  PUBLIC_ENGINE_CHIP_DISCONNECTED,
  PUBLIC_ENGINE_CHIP_LIVE,
  PUBLIC_ENGINE_DEMO_COPY,
  PUBLIC_ENGINE_IBM_HONESTY,
  PUBLIC_ENGINE_IBM_PAGES,
  PUBLIC_ENGINE_SCAN_COPY,
  PUBLIC_ENGINE_STATIC_COPY,
  PUBLIC_PAGES_SALES_FORM,
  PUBLIC_STATUS_NEXT_MOVE,
} from './publicInfrastructure';

describe('public infrastructure copy', () => {
  it('refuses fabricated public scans', () => {
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/static build has no CBOM engine/i);
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/labelled sample data only/i);
    expect(PUBLIC_ENGINE_SCAN_COPY).toMatch(/Press Run demo scan to start the interactive demo/i);
    expect(PUBLIC_ENGINE_CHIP_DISCONNECTED).toBe('Static Pages · no engine');
    expect(PUBLIC_ENGINE_CHIP_LIVE).toBe('RivicQ engine · live');
  });

  it('explains static auth without network-error framing', () => {
    expect(PUBLIC_ENGINE_STATIC_COPY).toMatch(/static and hosts no RivicQ engine/i);
    expect(PUBLIC_ENGINE_STATIC_COPY).toMatch(/deployed, configured engine/i);
    expect(PUBLIC_ENGINE_STATIC_COPY).not.toMatch(/network issue/i);
  });

  it('labels demo data and IBM honesty without fabricated state', () => {
    expect(PUBLIC_ENGINE_DEMO_COPY).toMatch(/interactive demo/i);
    expect(PUBLIC_ENGINE_DEMO_COPY).toMatch(/sample data/i);
    expect(PUBLIC_ENGINE_CHIP_DEMO).toBe('Interactive demo · sample data');
    expect(PUBLIC_ENGINE_IBM_HONESTY).toMatch(/No fabricated co-sell records/);
    expect(PUBLIC_ENGINE_IBM_HONESTY).toMatch(/not IBM Quantum hardware/);
    expect(PUBLIC_ENGINE_IBM_PAGES).toMatch(/GitHub Pages cannot load live readiness state/);
  });

  it('keeps GitHub Pages demo requests as a sales mailto', () => {
    expect(PUBLIC_PAGES_SALES_FORM).toMatch(/GitHub Pages has no live API/);
    expect(PUBLIC_PAGES_SALES_FORM).toMatch(/sales@rivicq.com/);
  });

  it('publishes one honest status and next move', () => {
    expect(PUBLIC_STATUS_NEXT_MOVE).toMatch(/^Current status: PARTIALLY IMPLEMENTED — controlled pilot ready/i);
    expect(PUBLIC_STATUS_NEXT_MOVE).toMatch(/BLOCKED BY EXTERNAL CONFIGURATION/i);
    expect(PUBLIC_STATUS_NEXT_MOVE).toMatch(/five security-leader interviews by 2026-11-24/i);
    expect(PUBLIC_STATUS_NEXT_MOVE).toMatch(/release-readiness roadmap/i);
  });
});
