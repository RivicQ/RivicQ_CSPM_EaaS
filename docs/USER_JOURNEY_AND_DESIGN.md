# RivicQ CryptoBOM – End-to-End User Journey & UI/UX Design

## Overview

This document defines the complete user journey from first login through CBOM scanning, QBOM analysis, and enterprise compliance reporting. The journey is designed to be clear, task-focused, and progressively reveal complexity based on user role and edition (OSS vs Enterprise).

---

## User Journey Flow

### 1. **Welcome & Edition Selection** (Public / Pre-Auth)

**Page:** `/` (Home)  
**Status:** Current state is good; minor enhancements suggested  

**User Actions:**
- View cryptography platform benefits
- Choose OSS or Enterprise edition
- Sign in or register

**Component Updates:**
- Add "Quick Start Scanning" call-to-action with a demo link
- Add live edition comparison card
- Add "Scan your first endpoint in 5 minutes" hero banner

**What We Display:**
- Feature highlights (inventory, scanner, compliance, PQC)
- Edition differences (OSS vs Enterprise)
- Quick entry points (Login, Register, Demo)

---

### 2. **Authentication & First Login** (Auth Barrier)

**Pages:** `/login` → `/register` → `/dashboard`

**User Actions:**
- Sign in with email/password
- Or (Enterprise) SSO with Google Workspace domain, Okta, Entra, etc.
- Accept terms and workspace invitation

**What Happens Behind the Scenes:**
- JWT token issued
- User role assigned (viewer, analyst, operator, admin)
- Tenant context set (OSS defaults to "default"; Enterprise uses org)
- Demo data or real inventory loaded

**Design Change:**
- Add workspace onboarding prompt on first login
- Show edition badge prominently (OSS vs Enterprise)
- Offer "guided first scan" or "skip to dashboard"

---

### 3. **Dashboard & Workspace Overview** (Hub Page)

**Page:** `/dashboard`  
**Status:** Current state is mature; needs QBOM integration

**What Users See:**
- Quick stats: Total assets, quantum-safe count, vulnerable assets
- Recent scans (last 5)
- Compliance posture summary
- Enterprise integrations (if available)
- Quick action buttons

**New Components to Add:**
1. **QBOM Risk Score Card** — Shows quantum-safe readiness (0-100 scale)
2. **Pending Enterprise Features** — If Enterprise edition but secrets missing, show setup prompt
3. **Endpoint Scan Status** — Live count of monitored endpoints vs scanned today
4. **Compliance Dashboard Tabs** — NIST, BSI, DORA, eIDAS summaries

**Data Flow:**
- Fetch inventory summary → asset counts
- Fetch recent scans → display status and findings
- Fetch quantum attestation → display QBOM risk
- Fetch compliance state → display framework scores

---

### 4. **Endpoint Discovery & Scope Definition** (New Page)

**Page:** `/scanner/setup` (or add to `/scanner` as step 1)  
**New Component:** `EndpointDiscoveryWizard`

**User Journey:**
1. **Select Discovery Method**
   - Manual entry (host:port)
   - Kubernetes cluster (select cluster, namespaces)
   - Cilium network telemetry (if available)
   - Cloud inventory (AWS, GCP, IBM Cloud if credentials present)
   - Import from previous scan

2. **Define Scan Scope**
   - Protocols: TLS, SSH, HTTP (checkboxes)
   - Rate limiting: aggressive, standard, gentle
   - Safe mode: yes (no destructive probes), no (full capability)
   - Timeout: 30s, 60s, 120s per endpoint

3. **Review & Approve**
   - Show endpoint list (count by protocol)
   - Allow add/remove/edit
   - Require confirmation before scan starts

**Data Model:**
```json
{
  "scope_id": "scope-2026-05-28-001",
  "created_by": "user_id",
  "endpoints": [
    {
      "id": "ep-001",
      "host": "api.example.com",
      "port": 443,
      "protocol": "tls",
      "label": "API Server",
      "status": "pending_scan"
    }
  ],
  "scan_config": {
    "protocols": ["tls", "ssh", "http"],
    "rate_limit": "standard",
    "safe_mode": true,
    "timeout_seconds": 60
  },
  "approved": true,
  "approved_by": "user_id",
  "approved_at": "2026-05-28T10:30:00Z"
}
```

---

### 5. **CBOM Scan Execution** (Active Scanning Page)

**Page:** `/scanner/run/:scan_id`  
**Component:** Enhanced `Scanner.tsx` with progress, evidence, and live findings

**Three-Phase UI:**

#### Phase 1: **Pre-Flight Check**
- Show endpoint list (count)
- Confirm scan config
- Show estimated time (based on endpoint count)
- Allow final edits or cancel

#### Phase 2: **Scanning in Progress**
- Live progress bar (0-100%)
- Per-endpoint status (pending, scanning, found, error)
- Evidence stream (TLS version, cipher suite, SSH key type as discovered)
- Cancellation allowed

**UI Layout:**
```
┌────────────────────────────────────────────┐
│ CBOM Scan: api.example.com                 │
├────────────────────────────────────────────┤
│ Progress: 45/128 endpoints scanned         │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░ 35%    │
├────────────────────────────────────────────┤
│ Endpoints Status:                          │
│ ✓ api.example.com:443 (TLS 1.3, ECDHE)   │
│ ↻ db.internal:5432 (scanning SSH)          │
│ ! lb.prod:8080 (timeout)                   │
│ ◯ cache.internal:6379 (pending)            │
├────────────────────────────────────────────┤
│ [Cancel Scan]  [Pause]  [Help]             │
└────────────────────────────────────────────┘
```

#### Phase 3: **Scan Complete**
- Final summary card
- Option to "View CBOM", "View Findings", or "Run Verification Scan"

---

### 6. **CBOM Results & Findings Page** (Core Results)

**Page:** `/scanner/results/:scan_id`  
**Component:** `CBOMResultsViewer`

**What Users See:**

1. **CBOM Summary Card**
   - Total endpoints scanned
   - Findings: Critical, High, Medium, Low
   - Scan time, completion time
   - Quantum-safe count, non-quantum-safe count

2. **Findings Tabs**
   - **By Severity** (Critical/High/Medium/Low)
   - **By Protocol** (TLS/SSH/HTTP)
   - **By Algorithm** (RSA-2048, ECDSA-P256, DSA, etc.)
   - **By Endpoint** (grouped by host)

3. **Per-Finding Detail**
   - Finding ID, type, title
   - Evidence (e.g., "TLS 1.0 negotiated", "MD5 in response body")
   - Affected endpoint(s)
   - BSI/DORA/eIDAS reference (if applicable)
   - Remediation steps

4. **Export & Share**
   - Download CBOM as JSON, PDF, SBOM format
   - Share findings with team
   - Integrate with ticketing (Jira, GitHub Issues) — Enterprise only

---

### 7. **QBOM Layer & Quantum Risk Assessment** (Enterprise Feature)

**Page:** `/enterprise/quantum-bom/:scan_id`  
**Component:** `QBOMViewer`

**What Is QBOM?**
- Quantum Bill of Materials: an overlay on top of CBOM showing quantum-safe risk for each component
- For each algorithm/key found, shows:
  - Current crypto algorithm
  - Quantum vulnerability score (0-100, higher = more vulnerable)
  - Migration options (PQC alternatives)
  - Migration effort (low/medium/high)
  - Deadline (based on NIST PQC timeline)

**QBOM Display:**

```
┌──────────────────────────────────────────────────────┐
│ Quantum Bill of Materials (QBOM) – Scan 2026-05-28   │
├──────────────────────────────────────────────────────┤
│ Quantum Readiness Score: 42/100  [████░░░░░░]        │
│ "Your infrastructure is vulnerable to harvest-now-   │
│  decrypt-later (HNDL) attacks. Migrate by 2028."     │
├──────────────────────────────────────────────────────┤
│ Quantum-Vulnerable Assets (23)                       │
│                                                      │
│ [RSA-2048]  8 assets  ← TLS certs, SSH keys        │
│ Quantum Score: 15/100 (CRITICAL)                    │
│ Risk: Breakable by 4000-qubit machine (~8 hours)   │
│ PQC Options: Kyber-768, ML-KEM-768                 │
│ Effort: MEDIUM • Timeline: 2027-Q3                 │
│                                                      │
│ [ECDSA-P256] 12 assets                             │
│ Quantum Score: 25/100 (HIGH)                       │
│ Risk: Breakable by 4000-qubit machine (~30 min)   │
│ PQC Options: Dilithium-3, ML-DSA-65               │
│ Effort: MEDIUM • Timeline: 2027-Q1                │
│                                                      │
│ [AES-256]  3 assets                                │
│ Quantum Score: 85/100 (SAFE)                       │
│ Status: Post-quantum resistant                     │
│ Action: Monitor – no change needed                 │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [Export Migration Plan] [Share with Team]           │
└──────────────────────────────────────────────────────┘
```

**QBOM Metrics:**
- Total quantum-vulnerable assets
- Quantum readiness trend (over time)
- Migration roadmap (by quarter)
- Highest-risk algorithms
- Estimated migration cost (if available)

---

### 8. **Compliance Framework View** (Enterprise)

**Page:** `/enterprise/compliance/:scan_id`  
**Component:** `ComplianceFrameworkViewer`

**Frameworks Displayed:**
1. **NIST PQC** (FIPS 203/204/205)
2. **BSI TR-02102-1** (German crypto standards)
3. **DORA Article 9** (Digital Operational Resilience)
4. **eIDAS 2.0** (EU digital identity)

**Per-Framework Display:**
```
┌──────────────────────────────────────────┐
│ NIST FIPS 203/204/205 Readiness          │
├──────────────────────────────────────────┤
│ Compliance Score: 62%                    │
│ ██████░░░░ Needs Attention              │
│                                          │
│ ✓ ML-KEM (Kyber) algorithms ready       │
│ ✓ ML-DSA (Dilithium) algorithms ready   │
│ ✗ SLH-DSA (SPHINCS+) not deployed       │
│ ! RSA-2048 still in use (non-PQC)       │
│                                          │
│ Recommendations:                         │
│ 1. Deploy ML-KEM for key exchange       │
│ 2. Retire RSA-2048 by Q3 2027           │
│ 3. Test SLH-DSA in staging               │
└──────────────────────────────────────────┘
```

**Integration with Findings:**
- Each finding linked to 1+ compliance frameworks
- Color-coded severity: Red (critical), Orange (high), Yellow (medium), Green (compliant)

---

### 9. **Enterprise Integration Status Dashboard** (Admin-Only)

**Page:** `/enterprise/integrations`  
**Component:** `IntegrationStatusBoard`

**What Admins See:**

| Integration | Status | Details | Action |
|---|---|---|---|
| **IBMQ** | 🟡 Missing API Key | Quantum attestation unavailable | [Configure] |
| **AWS CloudHSM** | 🟡 Pending creds | Credentials not in GitHub Secrets | [Setup] |
| **IBM Cloud HPCS** | 🟡 Pending creds | `IBM_CLOUD_API_KEY` not found | [Setup] |
| **GCP KMS** | 🟡 Pending creds | Service account not configured | [Setup] |
| **Slack Notifications** | ✅ Active | Scan alerts → #security channel | [Configure] |
| **Google Workspace SSO** | ✅ Active | rivicq.de domain authenticated | [Manage] |
| **Database** | ✅ Production | PostgreSQL on Cloud SQL | [Monitor] |

**Setup UI:**
- Each integration has a "Setup" card with instructions
- Paste secrets or authenticate via OAuth
- Test connection before saving
- Show integration health metrics

---

### 10. **Results Export & Sharing** (Multi-Format)

**Page:** `/scanner/results/:scan_id/export`  
**Component:** `ExportDialog`

**Export Formats:**
1. **JSON** — Full CBOM structure, all findings
2. **PDF** — Executive summary + findings table
3. **CSV** — Findings spreadsheet for import to Jira/Excel
4. **SBOM (CycloneDX)** — Component inventory in CycloneDX format
5. **QBOM (Enterprise)** — Quantum risk overlay

**Share Options:**
- Email report to team
- Create Jira tickets from findings
- Post to Slack channel
- Generate shareable link (with expiry)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Welcome / Home                            │
│                    (Edition Selection)                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │  Login / Register           │
        │  (Auth + JWT Token)         │
        └────────┬───────────────────┘
                 │
                 ↓
        ┌────────────────────────────┐
        │  Dashboard                  │
        │  (Workspace Overview)       │
        └────────┬───────────────────┘
                 │
        ┌────────┴──────────┐
        ↓                   ↓
   ┌────────────┐   ┌──────────────┐
   │ Inventory  │   │ Scanner      │
   │ View       │   │ Setup        │
   └────────┬───┘   └────┬─────────┘
            │            │
            │            ↓
            │   ┌─────────────────────┐
            │   │ Endpoint Discovery  │
            │   │ Define Scope        │
            │   └────┬────────────────┘
            │        │
            │        ↓
            │   ┌─────────────────────┐
            │   │ Scan Execution      │
            │   │ (Active Probing)    │
            │   └────┬────────────────┘
            │        │
            └────┬───┤
                 │   │
                 ↓   ↓
            ┌─────────────────┐
            │ Results View    │
            │ (CBOM)          │
            └────┬────────────┘
                 │
        ┌────────┴──────────┐
        ↓                   ↓
   ┌──────────┐      ┌─────────────┐
   │ Export   │      │ QBOM        │
   │ Results  │      │ (Enterprise)│
   └──────────┘      └────┬────────┘
                          │
                          ↓
                  ┌───────────────────┐
                  │ Compliance View   │
                  │ (NIST/BSI/DORA)   │
                  └───────────────────┘
```

---

## Component Checklist

### ✅ Existing (No Changes Needed)
- [x] Home page (enhance with QBOM CTA)
- [x] Login / Register
- [x] Dashboard (add QBOM card)
- [x] Scanner (rename from current, keep core logic)
- [x] Assets view

### 🟡 Needs Enhancement
- [ ] Scanner.tsx → Add endpoint discovery wizard
- [ ] Scanner.tsx → Add evidence stream during scan
- [ ] Dashboard.tsx → Add QBOM risk card
- [ ] Dashboard.tsx → Add enterprise setup prompt

### 🔴 New Components
- [ ] `EndpointDiscoveryWizard.tsx` — Step-by-step endpoint definition
- [ ] `CBOMResultsViewer.tsx` — Results display with tabs
- [ ] `QBOMViewer.tsx` — Quantum risk overlay (Enterprise)
- [ ] `ComplianceFrameworkViewer.tsx` — Compliance mapping (Enterprise)
- [ ] `IntegrationStatusBoard.tsx` — Admin integrations view
- [ ] `ExportDialog.tsx` — Multi-format export

---

## UI/UX Principles

1. **Progressive Disclosure** — Basic users see essentials; advanced users access deeper controls
2. **Task-Focused** — Each page has one clear primary action
3. **Real-Time Feedback** — Scans show live progress, not spinner
4. **Clear Edition Gates** — Enterprise features clearly marked; no surprises
5. **Evidence-Driven** — Every finding backed by concrete evidence (e.g., TLS handshake data)
6. **Compliance-First** — CBOM tied directly to framework requirements (NIST/BSI/DORA/eIDAS)

---

## Implementation Priority (2-Hour Sprint)

1. **Hour 1:** Add `EndpointDiscoveryWizard` and enhance `Scanner` with evidence stream
2. **Hour 1.5:** Add `CBOMResultsViewer` with tabs and per-finding detail
3. **Hour 2:** Add QBOM card to Dashboard + `ComplianceFrameworkViewer` stub

All new components placed in `/web/src/pages/` and `/web/src/components/` as appropriate.
