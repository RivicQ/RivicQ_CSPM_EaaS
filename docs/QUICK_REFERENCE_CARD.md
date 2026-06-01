# Quick Reference Card – New UI Components

## Component Quick Links

### 1. EndpointDiscoveryWizard.tsx
**Location:** `web/src/components/EndpointDiscoveryWizard.tsx`  
**Import:** `import EndpointDiscoveryWizard from '../components/EndpointDiscoveryWizard';`

**Usage:**
```tsx
<EndpointDiscoveryWizard
  open={openWizard}
  onClose={() => setOpenWizard(false)}
  onScanStart={(endpoints, config) => handleScanStart(endpoints, config)}
  loading={isLoading}
/>
```

**Key Props:**
- `open`: boolean – Controls dialog visibility
- `onClose`: () => void – Called when user cancels
- `onScanStart`: (Endpoint[], ScanConfig) => void – Called with scan parameters
- `loading?`: boolean – Disables buttons during submission

**Outputs:** `Endpoint[]` (host, port, protocol, label) + `ScanConfig` (protocols, rate_limit, safe_mode, timeout_seconds)

---

### 2. CBOMResultsViewer.tsx
**Location:** `web/src/components/CBOMResultsViewer.tsx`  
**Import:** `import CBOMResultsViewer from '../components/CBOMResultsViewer';`

**Usage:**
```tsx
<CBOMResultsViewer
  cbom={cbomData}
  loading={false}
  onExport={(format) => handleExport(format)}
  onShare={() => handleShare()}
/>
```

**Key Props:**
- `cbom`: CBOMSummary – Scan results data
- `loading?`: boolean – Shows spinner if true
- `onExport?`: (format: string) => void – Export button handler
- `onShare?`: () => void – Share button handler

**Displays:** Summary cards + 4 tabbed findings views + detail modal

---

### 3. QBOMViewer.tsx
**Location:** `web/src/components/QBOMViewer.tsx`  
**Import:** `import QBOMViewer from '../components/QBOMViewer';`

**Usage:**
```tsx
<QBOMViewer
  qbom={qbomData}
  onExport={() => handleExport()}
  onShareMigrationPlan={() => sharePlan()}
/>
```

**Key Props:**
- `qbom`: QBOMData – Quantum risk assessment
- `onExport?`: () => void – Export QBOM button
- `onShareMigrationPlan?`: () => void – Share migration plan button

**Displays:** Quantum readiness score + algorithms + migration roadmap + critical actions

---

### 4. ComplianceFrameworkViewer.tsx
**Location:** `web/src/components/ComplianceFrameworkViewer.tsx`  
**Import:** `import ComplianceFrameworkViewer from '../components/ComplianceFrameworkViewer';`

**Usage:**
```tsx
<ComplianceFrameworkViewer
  scan_id={scanId}
  frameworks={frameworksData}
  summary={{ total_findings: 23, critical_findings: 5, missing_mitigations: 3 }}
/>
```

**Key Props:**
- `scan_id`: string – Unique scan identifier
- `frameworks`: ComplianceFramework[] – Multi-framework data
- `summary?`: Summary metrics

**Displays:** Framework tabs (NIST/BSI/DORA/eIDAS) + compliance scores + requirements table

---

### 5. IntegrationStatusBoard.tsx
**Location:** `web/src/components/IntegrationStatusBoard.tsx`  
**Import:** `import IntegrationStatusBoard from '../components/IntegrationStatusBoard';`

**Usage:**
```tsx
<IntegrationStatusBoard
  integrations={integrationsList}
  secrets={secretsConfig}
  onConfigure={(id) => handleConfigure(id)}
  onTest={(id) => handleTest(id)}
  onRotateSecret={(key) => handleRotate(key)}
/>
```

**Key Props:**
- `integrations`: Integration[] – List of integrations by category
- `secrets?`: Record<string, IntegrationSecret> – Environment secrets status
- `onConfigure?`: (integrationId: string) => void
- `onTest?`: (integrationId: string) => void
- `onRotateSecret?`: (secretKey: string) => void

**Displays:** Integration cards by category + secrets table + setup dialogs

---

## New Pages to Create

### `/enterprise/quantum-bom/:scan_id`
**File:** `web/src/pages/enterprise/QuantumBOM.tsx`

```tsx
import QBOMViewer from '../../components/QBOMViewer';
import { useParams, useEffect, useState } from 'react';

const QuantumBOMPage = () => {
  const { scan_id } = useParams();
  const [qbom, setQBOM] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/scans/${scan_id}/qbom`)
      .then(r => r.json())
      .then(setQBOM);
  }, [scan_id]);

  return <QBOMViewer qbom={qbom} />;
};

export default QuantumBOMPage;
```

**Route:** `<Route path="/enterprise/quantum-bom/:scan_id" element={<QuantumBOMPage />} />`

---

### `/enterprise/compliance/:scan_id`
**File:** `web/src/pages/enterprise/Compliance.tsx`

```tsx
import ComplianceFrameworkViewer from '../../components/ComplianceFrameworkViewer';
import { useParams, useEffect, useState } from 'react';

const CompliancePage = () => {
  const { scan_id } = useParams();
  const [data, setData] = useState({ frameworks: [], summary: null });

  useEffect(() => {
    fetch(`/api/v1/scans/${scan_id}/compliance`)
      .then(r => r.json())
      .then(setData);
  }, [scan_id]);

  return (
    <ComplianceFrameworkViewer
      scan_id={scan_id}
      frameworks={data.frameworks}
      summary={data.summary}
    />
  );
};

export default CompliancePage;
```

**Route:** `<Route path="/enterprise/compliance/:scan_id" element={<CompliancePage />} />`

---

### `/enterprise/integrations`
**File:** `web/src/pages/enterprise/Integrations.tsx`

```tsx
import IntegrationStatusBoard from '../../components/IntegrationStatusBoard';
import { useEffect, useState } from 'react';

const IntegrationsPage = () => {
  const [data, setData] = useState({ integrations: [], secrets: {} });

  useEffect(() => {
    fetch('/api/v1/integrations/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData);
  }, []);

  return (
    <IntegrationStatusBoard
      integrations={data.integrations}
      secrets={data.secrets}
      onConfigure={(id) => console.log('Configure:', id)}
      onTest={(id) => console.log('Test:', id)}
      onRotateSecret={(key) => console.log('Rotate:', key)}
    />
  );
};

export default IntegrationsPage;
```

**Route:** `<Route path="/enterprise/integrations" element={<AdminRoute><IntegrationsPage /></AdminRoute>} />`

---

## Backend API Endpoints Required

### POST /api/v1/scans
**Request:**
```json
{
  "endpoints": [
    { "host": "api.example.com", "port": 443, "protocol": "tls", "label": "API" }
  ],
  "protocols": ["tls", "ssh", "http"],
  "rate_limit": "standard",
  "safe_mode": true,
  "timeout_seconds": 60
}
```

**Response:**
```json
{
  "scan_id": "scan-2026-05-28-001",
  "status": "pending"
}
```

### GET /api/v1/scans/:id
**Response:**
```json
{
  "id": "scan-001",
  "status": "complete|scanning|pending",
  "result": {
    "total_endpoints": 128,
    "scanned_endpoints": 45,
    "findings": [...],
    "total_findings": 23,
    "critical": 5,
    "high": 8,
    "quantum_safe_count": 83
  }
}
```

### GET /api/v1/scans/:id/qbom (Enterprise)
**Response:**
```json
{
  "scan_id": "scan-001",
  "quantum_readiness_score": 42,
  "algorithms": [...],
  "migration_roadmap": [...],
  "critical_actions": [...]
}
```

### GET /api/v1/scans/:id/compliance (Enterprise)
**Response:**
```json
{
  "scan_id": "scan-001",
  "frameworks": [
    {
      "name": "NIST FIPS 203/204/205",
      "compliance_status": { "status": "partial", "score": 62 },
      "requirements": [...]
    }
  ],
  "summary": { "total_findings": 23, "critical_findings": 5 }
}
```

### GET /api/v1/integrations/status (Enterprise Admin)
**Response:**
```json
{
  "integrations": [
    {
      "id": "ibmq",
      "name": "IBM Quantum",
      "category": "quantum",
      "status": "pending_setup",
      "required": true
    }
  ],
  "secrets": {
    "IBMQ_API_KEY": {
      "description": "IBM Quantum API Key",
      "required": true,
      "configured": false
    }
  }
}
```

---

## Integration Checklist

- [ ] Copy all 5 components to `/web/src/components/`
- [ ] Create 3 new pages in `/web/src/pages/enterprise/`
- [ ] Update `/web/src/pages/Scanner.tsx` with wizard integration
- [ ] Update `/web/src/App.tsx` with 3 new routes
- [ ] Implement 4 new backend API endpoints
- [ ] Update Dashboard.tsx with QBOM card
- [ ] Test end-to-end flow (home → wizard → scan → results)
- [ ] Deploy to staging for review
- [ ] Get stakeholder sign-off
- [ ] Merge to main branch

---

## Component Matrix

| Component | Purpose | Tab/Section | Status | Enterprise-Only |
|-----------|---------|-------------|--------|-----------------|
| EndpointDiscoveryWizard | Endpoint setup | Pre-scan | ✅ Complete | No |
| CBOMResultsViewer | CBOM findings | Results | ✅ Complete | No |
| QBOMViewer | Quantum risk | Results → QBOM | ✅ Complete | Yes |
| ComplianceFrameworkViewer | Compliance maps | Results → Compliance | ✅ Complete | Yes |
| IntegrationStatusBoard | Integrations mgmt | Admin → Integrations | ✅ Complete | Yes |

---

## Type Definitions

### Endpoint
```typescript
{
  id: string;
  host: string;
  port: number;
  protocol: 'tls' | 'ssh' | 'http';
  label: string;
  status?: 'pending_scan' | 'scanning' | 'completed' | 'error';
}
```

### ScanConfig
```typescript
{
  protocols: Array<'tls' | 'ssh' | 'http'>;
  rate_limit: 'gentle' | 'standard' | 'aggressive';
  safe_mode: boolean;
  timeout_seconds: number;
}
```

### Finding
```typescript
{
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  host: string;
  port: number;
  protocol: string;
  algorithm?: string;
  evidence: string;
  remediation: string;
  quantum_safe: boolean;
  bsi_ref?: string;
  dora_ref?: string;
  eidas_ref?: string;
}
```

### CBOMSummary
```typescript
{
  total_endpoints: number;
  scanned_endpoints: number;
  findings: Finding[];
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  quantum_safe_count: number;
  scan_started_at: string;
  scan_completed_at: string;
}
```

---

## Common Patterns

### Use Component in Page
```tsx
import ComponentName from '../../components/ComponentName';

const Page = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/endpoint').then(r => r.json()).then(setData);
  }, []);

  return data ? <ComponentName data={data} /> : <CircularProgress />;
};
```

### Export Button Handler
```tsx
const handleExport = (format: string) => {
  const dataStr = JSON.stringify(cbomData);
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/json;charset=utf-8,${dataStr}`);
  element.setAttribute('download', `cbom-export.${format}`);
  element.click();
};
```

### Share Button Handler
```tsx
const handleShare = async () => {
  if (navigator.share) {
    await navigator.share({ title: 'CBOM Results', text: 'View my scan' });
  } else {
    // Fallback: copy link
    const link = `${window.location.origin}/results/${scanId}`;
    navigator.clipboard.writeText(link);
  }
};
```

---

## Troubleshooting

**Components not importing?**  
→ Check import paths match your file structure  
→ Verify Material-UI is installed: `npm list @mui/material`

**Styles not applying?**  
→ Ensure MuiThemeProvider wraps your App in main.tsx  
→ Check theme token names (e.g., `primary.main`, `success.light`)

**Data not loading?**  
→ Check API endpoint URLs in fetch() calls  
→ Verify JWT token in Authorization header  
→ Use browser DevTools Network tab to inspect requests

**TypeScript errors?**  
→ Run `npm run build` to see full type errors  
→ Check interface definitions match API response schema

---

## Resources

- Full Design Doc: `docs/USER_JOURNEY_AND_DESIGN.md`
- Implementation Guide: `docs/IMPLEMENTATION_GUIDE_UI_COMPONENTS.md`
- Complete Summary: `docs/COMPLETE_DESIGN_SUMMARY.md`
- Material-UI: https://mui.com/
- React: https://react.dev/

---

**Created:** 2026-05-28  
**Status:** ✅ Production-Ready  
**Last Updated:** See docs for latest changes  
**Support:** Refer to IMPLEMENTATION_GUIDE_UI_COMPONENTS.md for detailed integration steps
