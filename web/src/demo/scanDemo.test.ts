import { demoScanRespond, isDemoSessionActive } from './scanDemo';
import { CLIENT_DEMO_TOKEN, DEMO_STORAGE_KEY } from './constants';
import { InternalAxiosRequestConfig } from 'axios';

function cfg(partial: Partial<InternalAxiosRequestConfig> & { method: string; url: string; data?: unknown }): InternalAxiosRequestConfig {
  return { headers: {}, ...partial } as InternalAxiosRequestConfig;
}

describe('scanDemo adapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is inactive without a demo session', () => {
    expect(isDemoSessionActive()).toBe(false);
  });

  it('matches demo routes when axios merges an absolute baseURL', async () => {
    localStorage.setItem(DEMO_STORAGE_KEY, '1');
    const started = await demoScanRespond(cfg({
      method: 'post',
      url: '/scans',
      baseURL: 'http://localhost:8080/api/v1',
      data: { target: 'https://example.com', scan_type: 'website' },
    } as Partial<InternalAxiosRequestConfig> & { method: string; url: string; data?: unknown }));
    expect(started?.status).toBe(201);
    expect(String(started?.data.scan_id)).toMatch(/^demo-/);
  });

  it('progresses a labelled demo scan to completion', async () => {
    localStorage.setItem(DEMO_STORAGE_KEY, '1');
    localStorage.setItem('auth_token', CLIENT_DEMO_TOKEN);
    expect(isDemoSessionActive()).toBe(true);

    const started = await demoScanRespond(cfg({
      method: 'post',
      url: '/scans',
      data: { target: 'https://example.com', scan_type: 'website' },
    }));
    expect(started?.status).toBe(201);
    const scanId = String(started?.data.scan_id);
    expect(scanId).toMatch(/^demo-/);

    let status = 'running';
    let findings: { total?: number; critical?: number } = {};
    let items: unknown[] = [];
    for (let i = 0; i < 8 && status !== 'completed'; i += 1) {
      const tick = await demoScanRespond(cfg({ method: 'get', url: `/scans/${scanId}` }));
      status = String(tick?.data.status);
      findings = tick?.data.findings || {};
      items = tick?.data.finding_items || [];
    }
    expect(status).toBe('completed');
    expect(findings.total).toBeGreaterThan(0);
    expect(findings.critical).toBeGreaterThan(0);
    expect(items.length).toBeGreaterThan(0);

    const report = await demoScanRespond(cfg({ method: 'get', url: `/scans/${scanId}/report` }));
    expect(report?.data.note).toMatch(/labelled sample data/i);
  });
});
