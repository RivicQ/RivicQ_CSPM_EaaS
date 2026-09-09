import { normalizeFinding, parseFindingsPayload, scanStatus } from './findings';

describe('ops findings', () => {
  it('normalizes scan findings without inventing scores', () => {
    const f = normalizeFinding({
      id: 'tls-1',
      severity: 'HIGH',
      title: 'RSA-2048 TLS',
      evidence: 'cipher=TLS_RSA',
      remediation: 'Prefer TLS 1.3',
      asset: 'example.com',
    });
    expect(f.severity).toBe('high');
    expect(f.evidence).toBe('cipher=TLS_RSA');
    expect(f.status).toBe('open');
  });

  it('parses the CBOM findings envelope', () => {
    const list = parseFindingsPayload({ source: 'cbom_scans', total: 1, findings: [{ id: 'a', severity: 'low', title: 'x' }] });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('a');
  });

  it('maps scan job status without color-only labels', () => {
    expect(scanStatus('failed')).toBe('failed');
    expect(scanStatus('running')).toBe('running');
    expect(scanStatus('')).toBe('unknown');
  });
});
