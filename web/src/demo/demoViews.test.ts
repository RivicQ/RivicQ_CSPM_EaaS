import { buildDemoComplianceDashboards, buildDemoCspmOverview, buildDemoRisks, DEMO_COMPLIANCE_FRAMEWORKS } from './demoViews';

describe('demo views', () => {
  it('builds a labeled CSPM snapshot without pretending it is live telemetry', () => {
    const overview = buildDemoCspmOverview();
    expect(overview.demo).toBe(true);
    expect(overview.source).toBe('enterprise_simulation');
    expect(overview.health_score).toBeGreaterThan(0);
    expect(overview.total_assets).toBeGreaterThan(0);
    expect(overview.risk_breakdown.length).toBeGreaterThan(3);
    expect(overview.findings.length).toBeGreaterThan(0);
  });

  it('maps ISO 27001, NIS2, DORA, GDPR and BSI as demo controls, not certifications', () => {
    const dashboards = buildDemoComplianceDashboards();
    const ids = dashboards.map((d) => d.framework);
    DEMO_COMPLIANCE_FRAMEWORKS.forEach((id) => {
      expect(ids).toContain(id);
    });
    dashboards.forEach((d) => {
      expect(d.status).toBe('demo');
      expect(d.note.toLowerCase()).toContain('not a certification');
      expect(d.total_controls).toBeGreaterThan(0);
    });
  });

  it('exposes demo risks from simulated findings', () => {
    const risks = buildDemoRisks();
    expect(risks.length).toBeGreaterThan(0);
    expect(risks[0].id).toBeTruthy();
  });
});
