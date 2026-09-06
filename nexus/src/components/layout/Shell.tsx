import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Mark from '../../brand/Mark';
import { DEMO_NOTICE } from '../../data/catalog';
import { useSession } from '../../state/session';
import CommandPalette from '../ui/CommandPalette';

const groups: { title: string; items: [string, string][] }[] = [
  {
    title: 'Operations',
    items: [
      ['Command Center', '/app/command'],
      ['Security Posture', '/app/posture'],
      ['Cloud Security', '/app/cloud'],
      ['Assets', '/app/assets'],
      ['Attack Surface', '/app/attack'],
      ['Vulnerabilities', '/app/vulns'],
      ['Identity', '/app/identity'],
      ['Data Security', '/app/data'],
      ['Workloads', '/app/workloads'],
      ['Kubernetes', '/app/kubernetes'],
    ],
  },
  {
    title: 'Intelligence',
    items: [
      ['Software Supply Chain', '/app/sbom'],
      ['CryptoBOM', '/app/cryptobom'],
      ['Certificates', '/app/certs'],
      ['Secrets', '/app/secrets'],
      ['PQC Readiness', '/app/pqc'],
      ['AI Security', '/app/ai'],
      ['Compliance', '/app/compliance'],
      ['Automation', '/app/automation'],
      ['AI Analyst', '/app/analyst'],
    ],
  },
  {
    title: 'Bills of materials',
    items: [
      ['Hardware BOM', '/app/hbom'],
      ['Infrastructure BOM', '/app/ibom'],
    ],
  },
  {
    title: 'Enterprise',
    items: [
      ['Integrations', '/app/integrations'],
      ['Reports', '/app/reports'],
      ['Billing', '/app/billing'],
      ['Administration', '/app/admin'],
    ],
  },
];

const NavGroups: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
  <>
    {groups.map((g) => (
      <React.Fragment key={g.title}>
        <div className="group">{g.title}</div>
        {g.items.map(([label, to]) => (
          <NavLink key={to} to={to} onClick={onNavigate}>{label}</NavLink>
        ))}
      </React.Fragment>
    ))}
  </>
);

const Shell: React.FC = () => {
  const nav = useNavigate();
  const { mode, setMode, role, tenant, setTenant, tenants } = useSession();
  const [palette, setPalette] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <aside className="nav" aria-label="Primary">
        <NavLink to="/" className="mark">
          <Mark />
          <div>
            <strong>NEXUS</strong>
            <span>Quantum Security Fabric</span>
          </div>
        </NavLink>
        <NavGroups />
      </aside>
      {mobile && (
        <>
          <div className="backdrop" onClick={() => setMobile(false)} />
          <nav className="nav-drawer" aria-label="Mobile primary">
            <NavGroups onNavigate={() => setMobile(false)} />
          </nav>
        </>
      )}
      <div className="app-main">
        <header className="topbar">
          <div>
            <div className="btn-row mobile-nav">
              <button type="button" className="btn" onClick={() => setMobile(true)}>Menu</button>
            </div>
            <label>
              <span className="visually-hidden">Tenant context</span>
              <select
                className="btn"
                value={`${tenant.unit}-${tenant.env}-${tenant.cloud}`}
                onChange={(e) => {
                  const next = tenants.find((t) => `${t.unit}-${t.env}-${t.cloud}` === e.target.value);
                  if (next) setTenant(next);
                }}
                aria-label="Tenant context"
              >
                {tenants.map((t) => (
                  <option key={`${t.unit}-${t.env}-${t.cloud}`} value={`${t.unit}-${t.env}-${t.cloud}`}>
                    {t.org} · {t.unit} · {t.env} · {t.cloud} {t.region}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{role} view</div>
          </div>
          <div className="btn-row">
            <label>
              <span className="visually-hidden">Mode</span>
              <select className="btn" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} aria-label="Workspace mode">
                <option value="ciso">Executive mode</option>
                <option value="engineer">Engineering mode</option>
                <option value="auditor">Auditor mode</option>
              </select>
            </label>
            <button type="button" className="btn" onClick={() => setPalette(true)}>Command (⌘K)</button>
            <button type="button" className="btn" onClick={() => nav('/app/graph')}>Security graph</button>
            <button type="button" className="btn" onClick={() => nav('/legal')}>Legal</button>
          </div>
        </header>
        <div className="page">
          <div className="banner" role="status">{DEMO_NOTICE} Secret values are never rendered.</div>
          <Outlet />
        </div>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
};

export default Shell;
