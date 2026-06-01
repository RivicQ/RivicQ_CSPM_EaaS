# Implementation Guide: Wiring Components into Pages

## Overview
This guide explains how to integrate the 5 new React components into the existing CryptoBOM SaaS application. All components follow Material-UI patterns and are ready for integration with the backend API.

---

## 1. Enhanced Scanner.tsx – CBOM Scan Flow

**Current File:** `/web/src/pages/Scanner.tsx`  
**New Dependencies:**
- `EndpointDiscoveryWizard` – for endpoint setup
- `CBOMResultsViewer` – for results display
- Plus enhanced progress tracking

**Recommended Structure:**

```typescript
import React, { useState, useEffect } from 'react';
import EndpointDiscoveryWizard from '../components/EndpointDiscoveryWizard';
import CBOMResultsViewer from '../components/CBOMResultsViewer';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ScanState {
  phase: 'setup' | 'scanning' | 'complete';
  endpoints?: Endpoint[];
  scanConfig?: ScanConfig;
  scanId?: string;
  scanStatus?: CBOMSummary;
}

const Scanner: React.FC = () => {
  const [scanState, setScanState] = useState<ScanState>({ phase: 'setup' });
  const [openWizard, setOpenWizard] = useState(true);
  const [polling, setPolling] = useState(false);

  // When user submits wizard
  const handleScanStart = async (endpoints: Endpoint[], config: ScanConfig) => {
    setScanState({ phase: 'scanning', endpoints, scanConfig: config });
    
    // Call API: POST /api/v1/scans
    const response = await fetch('/api/v1/scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoints,
        protocols: config.protocols,
        rate_limit: config.rate_limit,
        safe_mode: config.safe_mode,
        timeout_seconds: config.timeout_seconds,
      }),
    });
    
    const { scan_id } = await response.json();
    setScanState(prev => ({ ...prev, scanId: scan_id }));
    setPolling(true);
  };

  // Poll for scan results
  useEffect(() => {
    if (!polling || !scanState.scanId) return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/v1/scans/${scanState.scanId}`);
      const data = await response.json();
      
      if (data.status === 'complete') {
        setScanState(prev => ({
          ...prev,
          phase: 'complete',
          scanStatus: data.result,
        }));
        setPolling(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [polling, scanState.scanId]);

  return (
    <Box sx={{ p: 3 }}>
      {scanState.phase === 'setup' && (
        <EndpointDiscoveryWizard
          open={openWizard}
          onClose={() => setOpenWizard(false)}
          onScanStart={handleScanStart}
        />
      )}

      {scanState.phase === 'scanning' && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Scanning {scanState.endpoints?.length} endpoints...</Typography>
        </Box>
      )}

      {scanState.phase === 'complete' && scanState.scanStatus && (
        <CBOMResultsViewer
          cbom={scanState.scanStatus}
          onExport={(format) => console.log('Export:', format)}
          onShare={() => console.log('Share results')}
        />
      )}
    </Box>
  );
};

export default Scanner;
```

**Key Changes:**
- Workflow: setup → scanning → results
- Polling loop checks `GET /api/v1/scans/:id` for status
- Results displayed in CBOMResultsViewer with findings tabs

---

## 2. New Enterprise Route: `/enterprise/quantum-bom/:scan_id`

**New File:** `/web/src/pages/enterprise/QuantumBOM.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QBOMViewer from '../../components/QBOMViewer';
import { Box, CircularProgress, Alert } from '@mui/material';

const QuantumBOMPage: React.FC = () => {
  const { scan_id } = useParams<{ scan_id: string }>();
  const [qbom, setQBOM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQBOM = async () => {
      try {
        const response = await fetch(`/api/v1/scans/${scan_id}/qbom`);
        const data = await response.json();
        setQBOM(data);
      } catch (error) {
        console.error('Failed to fetch QBOM:', error);
      } finally {
        setLoading(false);
      }
    };

    if (scan_id) fetchQBOM();
  }, [scan_id]);

  if (loading) return <CircularProgress />;
  if (!qbom) return <Alert severity="error">Failed to load QBOM</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <QBOMViewer
        qbom={qbom}
        onExport={() => console.log('Export QBOM')}
        onShareMigrationPlan={() => console.log('Share plan')}
      />
    </Box>
  );
};

export default QuantumBOMPage;
```

**Route Addition in App.tsx:**
```typescript
<Route path="/enterprise/quantum-bom/:scan_id" element={<QuantumBOMPage />} />
```

---

## 3. New Enterprise Route: `/enterprise/compliance/:scan_id`

**New File:** `/web/src/pages/enterprise/Compliance.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ComplianceFrameworkViewer from '../../components/ComplianceFrameworkViewer';
import { Box, CircularProgress, Alert } from '@mui/material';

const CompliancePage: React.FC = () => {
  const { scan_id } = useParams<{ scan_id: string }>();
  const [frameworks, setFrameworks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const response = await fetch(`/api/v1/scans/${scan_id}/compliance`);
        const data = await response.json();
        setFrameworks(data.frameworks);
        setSummary(data.summary);
      } catch (error) {
        console.error('Failed to fetch compliance:', error);
      } finally {
        setLoading(false);
      }
    };

    if (scan_id) fetchCompliance();
  }, [scan_id]);

  if (loading) return <CircularProgress />;
  if (!frameworks.length) return <Alert severity="error">No compliance data</Alert>;

  return (
    <Box sx={{ p: 3 }}>
      <ComplianceFrameworkViewer
        scan_id={scan_id || ''}
        frameworks={frameworks}
        summary={summary}
      />
    </Box>
  );
};

export default CompliancePage;
```

**Route Addition in App.tsx:**
```typescript
<Route path="/enterprise/compliance/:scan_id" element={<CompliancePage />} />
```

---

## 4. New Admin Route: `/enterprise/integrations`

**New File:** `/web/src/pages/enterprise/Integrations.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import IntegrationStatusBoard from '../../components/IntegrationStatusBoard';
import { Box, CircularProgress, Alert } from '@mui/material';

const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState([]);
  const [secrets, setSecrets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch('/api/v1/integrations/status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();
        setIntegrations(data.integrations);
        setSecrets(data.secrets);
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const handleConfigure = async (integrationId: string) => {
    console.log('Configure:', integrationId);
    // API call to save configuration
  };

  const handleTest = async (integrationId: string) => {
    console.log('Test:', integrationId);
    // API call to test integration
  };

  const handleRotateSecret = async (secretKey: string) => {
    console.log('Rotate secret:', secretKey);
    // API call to rotate secret
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <IntegrationStatusBoard
        integrations={integrations}
        secrets={secrets}
        onConfigure={handleConfigure}
        onTest={handleTest}
        onRotateSecret={handleRotateSecret}
      />
    </Box>
  );
};

export default IntegrationsPage;
```

**Route Addition in App.tsx:**
```typescript
<Route path="/enterprise/integrations" element={<IntegrationsPage />} />
```

---

## 5. Enhanced Dashboard.tsx – Add QBOM & Integration Cards

**Modifications to existing Dashboard.tsx:**

```typescript
// Add to imports
import QBOMViewer from '../components/QBOMViewer';
import IntegrationStatusBoard from '../components/IntegrationStatusBoard';

// In Dashboard component, add new cards
const Dashboard: React.FC = () => {
  const [qbomScore, setQBOMScore] = useState(0);
  const [integrationStatus, setIntegrationStatus] = useState({});

  useEffect(() => {
    // Fetch QBOM summary
    fetch('/api/v1/quantum-readiness')
      .then(r => r.json())
      .then(data => setQBOMScore(data.quantum_readiness_score));

    // Fetch integration status
    fetch('/api/v1/integrations/summary')
      .then(r => r.json())
      .then(data => setIntegrationStatus(data));
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Existing metric cards */}
      
      {/* NEW: QBOM Risk Card */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Shield sx={{ color: 'warning.main' }} />
              <Typography variant="overline">Quantum Risk</Typography>
            </Box>
            <Typography variant="h4">{qbomScore}</Typography>
            <Typography variant="body2" color="text.secondary">
              Readiness Score
            </Typography>
            <Button size="small" sx={{ mt: 1 }}>
              View QBOM
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* NEW: Enterprise Setup Card (if not fully configured) */}
      {integrationStatus.pending_count > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {integrationStatus.pending_count} enterprise features pending setup.
          <Button href="/enterprise/integrations">Configure now</Button>
        </Alert>
      )}
    </Box>
  );
};
```

---

## 6. Backend API Endpoints Required

### GET `/api/v1/scans/:id`
```json
{
  "id": "scan-001",
  "status": "complete|scanning|pending",
  "result": {
    "total_endpoints": 128,
    "scanned_endpoints": 45,
    "findings": [
      {
        "id": "finding-001",
        "title": "TLS 1.0 Negotiated",
        "severity": "critical",
        "host": "api.example.com",
        "port": 443,
        "protocol": "tls",
        "algorithm": "TLS-1.0",
        "evidence": "TLS version 1.0 negotiated in handshake",
        "remediation": "Upgrade to TLS 1.2 or higher",
        "quantum_safe": false,
        "bsi_ref": "TR-02102-1",
        "dora_ref": "Article 9"
      }
    ],
    "total_findings": 23,
    "critical": 5,
    "high": 8,
    "medium": 7,
    "low": 3,
    "quantum_safe_count": 83,
    "scan_started_at": "2026-05-28T10:00:00Z",
    "scan_completed_at": "2026-05-28T10:45:00Z"
  }
}
```

### GET `/api/v1/scans/:id/qbom` (Enterprise)
```json
{
  "scan_id": "scan-001",
  "quantum_readiness_score": 42,
  "total_assets": 128,
  "quantum_safe_assets": 45,
  "quantum_vulnerable_assets": 83,
  "algorithms": [
    {
      "name": "RSA-2048",
      "type": "encryption",
      "asset_count": 8,
      "quantum_score": 15,
      "risk_level": "critical",
      "break_time": "8 hours with 4000 qubits",
      "pqc_alternatives": [
        {
          "name": "Kyber-768",
          "nist_status": "standardized",
          "migration_effort": "medium",
          "timeline": "2027-Q3"
        }
      ]
    }
  ],
  "migration_roadmap": [
    {
      "quarter": "2026-Q3",
      "milestone": "Pilot PQC deployment",
      "target_algorithms": ["RSA-2048"],
      "estimated_effort": "80 hours"
    }
  ],
  "critical_actions": [
    "Begin RSA key rotation to 3072 bits minimum",
    "Evaluate Kyber-768 for TLS deployments",
    "Start PQC testing in staging environment"
  ]
}
```

### GET `/api/v1/scans/:id/compliance` (Enterprise)
```json
{
  "scan_id": "scan-001",
  "frameworks": [
    {
      "name": "NIST FIPS 203/204/205",
      "short_name": "NIST",
      "description": "NIST post-quantum cryptography standards",
      "compliance_status": {
        "status": "partial",
        "score": 62
      },
      "requirements": [
        {
          "id": "nist-001",
          "title": "ML-KEM Implementation",
          "section": "FIPS 203",
          "status": "compliant",
          "findings_count": 0,
          "impact": "critical",
          "remediation": "No action needed"
        }
      ],
      "deadline": "2028-12-31",
      "resources": ["https://csrc.nist.gov/publications/fips-203"]
    }
  ],
  "summary": {
    "total_findings": 23,
    "critical_findings": 5,
    "missing_mitigations": 3
  }
}
```

### GET `/api/v1/integrations/status` (Enterprise)
```json
{
  "integrations": [
    {
      "id": "ibmq",
      "name": "IBM Quantum",
      "category": "quantum",
      "status": "pending_setup",
      "description": "Quantum attestation service",
      "required": true,
      "setup_guide_url": "https://docs.example.com/setup/ibmq"
    }
  ],
  "secrets": {
    "IBMQ_API_KEY": {
      "description": "IBM Quantum Network API Key",
      "required": true,
      "configured": false
    },
    "DATABASE_URL": {
      "description": "Production PostgreSQL connection",
      "required": true,
      "configured": true,
      "last_rotated": "2026-05-15"
    }
  }
}
```

---

## 7. Modified App.tsx Routes

**Add these routes to your Router:**

```typescript
// Public routes (unchanged)
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

// Protected routes (existing)
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />

// NEW Enterprise routes
<Route 
  path="/enterprise/quantum-bom/:scan_id" 
  element={<ProtectedRoute><QuantumBOMPage /></ProtectedRoute>} 
/>
<Route 
  path="/enterprise/compliance/:scan_id" 
  element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} 
/>
<Route 
  path="/enterprise/integrations" 
  element={<AdminRoute><IntegrationsPage /></AdminRoute>} 
/>
```

---

## 8. Testing & Validation Checklist

- [ ] EndpointDiscoveryWizard navigates through all 4 steps
- [ ] Add endpoint validation (hostname, port, protocol)
- [ ] Edit/delete functionality works
- [ ] CBOMResultsViewer displays all 4 tab types correctly
- [ ] Finding detail modal opens and shows all fields
- [ ] QBOMViewer displays quantum score and algorithm list
- [ ] Algorithm detail modal shows PQC alternatives
- [ ] ComplianceFrameworkViewer tabs navigate correctly
- [ ] Framework compliance scores display and update
- [ ] IntegrationStatusBoard displays all categories
- [ ] Setup dialog appears when needed
- [ ] End-to-end flow: Home → Wizard → Scanner → CBOM → QBOM → Compliance
- [ ] Export buttons functional (placeholder is ok)
- [ ] Mobile responsive (xs, sm, md grid breakpoints)
- [ ] Accessibility: keyboard navigation, ARIA labels

---

## 9. Performance Optimization Notes

- Use React.memo() for CBOMResultsViewer findings table to prevent unnecessary re-renders
- Lazy load QBOMViewer and ComplianceFrameworkViewer on demand
- Implement virtualization for large findings lists (>1000 items)
- Cache API responses for scan results (5-minute TTL)
- Use EventSource API instead of polling for live scan progress (optional enhancement)

---

## 10. Future Enhancements

1. **Export Formats**
   - PDF generation (use react-pdf or jsPDF)
   - CycloneDX SBOM export
   - JIRA ticket creation from findings

2. **Notifications**
   - Slack webhook integration
   - Email alerts for critical findings
   - Teams/Discord integration

3. **SSO & Identity**
   - Google Workspace OIDC
   - Okta integration
   - Entra ID (Microsoft) integration

4. **Advanced Reporting**
   - Compliance audit trail
   - Trend analysis (quantum risk over time)
   - Executive summary PDF
   - Remediation burndown chart

5. **Automation**
   - Scheduled scans (cron expressions)
   - Automatic remediation suggestions
   - Integration with ServiceNow CMDB
   - Auto-ticket creation for critical findings
