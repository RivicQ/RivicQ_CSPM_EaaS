import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  CircularProgress,
  LinearProgress,
  Alert,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  NetworkCheck,
  PlayArrow,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';

// ── Types ────────────────────────────────────────────────────────────────────

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface Finding {
  id: string;
  target_id: string;
  target_label: string;
  host: string;
  port: number;
  protocol: string;
  finding_type: string;
  title: string;
  description: string;
  evidence: string;
  severity: SeverityLevel;
  algorithm: string;
  key_length: number;
  remediation: string;
  bsi_ref: string;
  dora_ref: string;
  eidas_ref: string;
  quantum_safe: boolean;
  scanned_at: string;
}

interface ScanSummary {
  total_targets: number;
  scanned_targets: number;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  quantum_unsafe: number;
  bsi_compliant: number;
}

interface ScanResult {
  scan_id: string;
  started_at: string;
  completed_at: string;
  findings: Finding[];
  summary: ScanSummary;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_FINDINGS: Finding[] = [
  {
    id: 'f-001', target_id: 'tls-1', target_label: 'NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)',
    host: 'localhost', port: 4431, protocol: 'tls', finding_type: 'WEAK_TLS_VERSION',
    title: 'TLS 1.0 Detected',
    description: 'TLS 1.0 is deprecated and contains known vulnerabilities (BEAST, POODLE). Prohibited by BSI TR-02102-2 and eIDAS 2.0.',
    evidence: 'TLS version: TLS 1.0 (0x0301)', severity: 'CRITICAL', algorithm: 'TLS 1.0', key_length: 0,
    remediation: 'Upgrade to TLS 1.2 (minimum) or TLS 1.3. Disable TLS 1.0 and 1.1 in server config.',
    bsi_ref: 'BSI TR-02102-2, Section 3.2', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:01Z',
  },
  {
    id: 'f-002', target_id: 'tls-1', target_label: 'NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)',
    host: 'localhost', port: 4431, protocol: 'tls', finding_type: 'WEAK_CIPHER_RC4',
    title: 'RC4 Cipher Suite Detected',
    description: 'RC4 is a broken stream cipher with multiple known vulnerabilities (BEAST, RC4 biases). Use is prohibited.',
    evidence: 'Negotiated cipher: TLS_RSA_WITH_RC4_128_SHA', severity: 'CRITICAL', algorithm: 'RC4', key_length: 128,
    remediation: 'Disable RC4 cipher suites. Use ECDHE with AES-GCM or ChaCha20-Poly1305.',
    bsi_ref: 'BSI TR-02102-2, Section 3.3.1', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:01Z',
  },
  {
    id: 'f-003', target_id: 'tls-4', target_label: 'Java Legacy HTTPS (RSA-512, MD5withRSA)',
    host: 'localhost', port: 8443, protocol: 'tls', finding_type: 'WEAK_KEY_RSA',
    title: 'RSA Key Too Short (512 bits)',
    description: 'RSA-512 is cryptographically weak and can be factored with modern hardware.',
    evidence: 'Certificate public key: RSA-512', severity: 'CRITICAL', algorithm: 'RSA', key_length: 512,
    remediation: 'Replace certificate with RSA-3072 or higher.',
    bsi_ref: 'BSI TR-02102-1, Section 3.5', dora_ref: 'DORA Art. 9(4)(b)', eidas_ref: 'eIDAS 2.0 Annex IV',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:05Z',
  },
  {
    id: 'f-004', target_id: 'tls-1', target_label: 'NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)',
    host: 'localhost', port: 4431, protocol: 'tls', finding_type: 'WEAK_SIG_SHA1',
    title: 'SHA-1 Certificate Signature',
    description: 'SHA-1 is deprecated for certificate signing. Practical collision attacks demonstrated (SHAttered).',
    evidence: 'Certificate signature algorithm: SHA1withRSA', severity: 'HIGH', algorithm: 'SHA1withRSA', key_length: 0,
    remediation: 'Re-issue certificate using SHA-256 or SHA-384 signature algorithm.',
    bsi_ref: 'BSI TR-02102-1, Section 3.3', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:01Z',
  },
  {
    id: 'f-005', target_id: 'ssh-1', target_label: 'SSH Weak KEX + DSA Host Key',
    host: 'localhost', port: 2222, protocol: 'ssh', finding_type: 'WEAK_SSH_KEX',
    title: 'Oakley Group 1 (768-bit DH) KEX Detected',
    description: 'diffie-hellman-group1-sha1 uses 768-bit DH (Oakley Group 1) — trivially breakable (Logjam attack).',
    evidence: 'SSH KEX algorithm offered: diffie-hellman-group1-sha1', severity: 'HIGH', algorithm: 'diffie-hellman-group1-sha1', key_length: 768,
    remediation: 'Remove weak KEX algorithms. Use curve25519-sha256 or diffie-hellman-group16-sha512.',
    bsi_ref: 'BSI TR-02102-4, Section 3.2', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:03Z',
  },
  {
    id: 'f-006', target_id: 'tls-2', target_label: 'NGINX TLS 1.2 (No Forward Secrecy)',
    host: 'localhost', port: 4432, protocol: 'tls', finding_type: 'NO_FORWARD_SECRECY',
    title: 'TLS 1.2 Without Forward Secrecy',
    description: 'TLS 1.2 cipher suite does not provide forward secrecy (no ECDHE/DHE key exchange).',
    evidence: 'TLS 1.2 with cipher: TLS_RSA_WITH_AES_128_CBC_SHA', severity: 'HIGH', algorithm: 'TLS_RSA_WITH_AES_128_CBC_SHA', key_length: 0,
    remediation: 'Require ECDHE or DHE key exchange. Remove non-FS cipher suites.',
    bsi_ref: 'BSI TR-02102-2, Section 3.3', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:02Z',
  },
  {
    id: 'f-007', target_id: 'tls-2', target_label: 'NGINX TLS 1.2 (No Forward Secrecy)',
    host: 'localhost', port: 4432, protocol: 'tls', finding_type: 'RSA_2048_SUBOPTIMAL',
    title: 'RSA-2048 Key (Upgrade Recommended)',
    description: 'RSA-2048 meets minimums but BSI recommends RSA-3072+ for post-2025 security.',
    evidence: 'Certificate public key: RSA-2048', severity: 'MEDIUM', algorithm: 'RSA', key_length: 2048,
    remediation: 'Migrate to RSA-3072 or ECDSA-P-256/P-384.',
    bsi_ref: 'BSI TR-02102-1, Section 3.5', dora_ref: 'DORA Art. 9(4)(b)', eidas_ref: 'eIDAS 2.0 Annex IV',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:02Z',
  },
  {
    id: 'f-008', target_id: 'tls-3', target_label: 'NGINX TLS 1.3 (Reference - Good)',
    host: 'localhost', port: 4433, protocol: 'tls', finding_type: 'TLS12_BEST_PRACTICE',
    title: 'TLS 1.2 Best Practice: Prefer TLS 1.3',
    description: 'TLS 1.3 provides improved security and mandatory forward secrecy.',
    evidence: 'TLS 1.2 negotiated', severity: 'MEDIUM', algorithm: 'TLS 1.2', key_length: 0,
    remediation: 'Configure server to prefer TLS 1.3.',
    bsi_ref: 'BSI TR-02102-2, Section 3.2', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:02Z',
  },
  {
    id: 'f-009', target_id: 'http-1', target_label: 'Legacy MD5 Hash API',
    host: 'localhost', port: 5001, protocol: 'http', finding_type: 'MISSING_HSTS',
    title: 'Missing HTTP Strict-Transport-Security Header',
    description: 'Absent HSTS header allows potential protocol downgrade attacks.',
    evidence: "HTTP response missing 'Strict-Transport-Security' header", severity: 'MEDIUM', algorithm: '', key_length: 0,
    remediation: "Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload'.",
    bsi_ref: 'BSI TR-02102-2, Section 3.6', dora_ref: 'DORA Art. 9(2)', eidas_ref: '',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:04Z',
  },
  {
    id: 'f-010', target_id: 'http-1', target_label: 'Legacy MD5 Hash API',
    host: 'localhost', port: 5001, protocol: 'http', finding_type: 'MISSING_XCTO',
    title: 'Missing X-Content-Type-Options Header',
    description: 'Missing header can allow MIME-sniffing attacks.',
    evidence: "HTTP response missing 'X-Content-Type-Options' header", severity: 'LOW', algorithm: '', key_length: 0,
    remediation: "Add 'X-Content-Type-Options: nosniff'.",
    bsi_ref: 'BSI TR-03161, Section 4.1', dora_ref: 'DORA Art. 9(2)', eidas_ref: '',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:04Z',
  },
  {
    id: 'f-011', target_id: 'http-1', target_label: 'Legacy MD5 Hash API',
    host: 'localhost', port: 5001, protocol: 'http', finding_type: 'MISSING_XFO',
    title: 'Missing X-Frame-Options Header',
    description: 'Missing header may allow clickjacking attacks.',
    evidence: "HTTP response missing 'X-Frame-Options' header", severity: 'LOW', algorithm: '', key_length: 0,
    remediation: "Add 'X-Frame-Options: DENY'.",
    bsi_ref: 'BSI TR-03161, Section 4.1', dora_ref: 'DORA Art. 9(2)', eidas_ref: '',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:04Z',
  },
  {
    id: 'f-012', target_id: 'ssh-1', target_label: 'SSH Weak KEX + DSA Host Key',
    host: 'localhost', port: 2222, protocol: 'ssh', finding_type: 'WEAK_HOST_KEY_DSA',
    title: 'DSA Host Key Detected',
    description: 'DSA is limited to 1024-bit keys and is deprecated in OpenSSH.',
    evidence: 'SSH host key algorithm: ssh-dss', severity: 'CRITICAL', algorithm: 'DSA', key_length: 1024,
    remediation: 'Replace DSA host keys with Ed25519 or ECDSA P-256.',
    bsi_ref: 'BSI TR-02102-4, Section 3.4', dora_ref: 'DORA Art. 9(2)', eidas_ref: 'eIDAS 2.0 ETSI TS 119 312',
    quantum_safe: false, scanned_at: '2026-02-26T01:00:03Z',
  },
];

const SEED_SUMMARY: ScanSummary = {
  total_targets: 6, scanned_targets: 6, total_findings: 12,
  critical: 4, high: 3, medium: 3, low: 2, quantum_unsafe: 12, bsi_compliant: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  CRITICAL: '#da1e28',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  INFO: '#6b7280',
};

const SEVERITY_BG: Record<SeverityLevel, string> = {
  CRITICAL: '#fef2f2',
  HIGH: '#fff7ed',
  MEDIUM: '#fefce8',
  LOW: '#f0fdf4',
  INFO: '#f9fafb',
};

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  return (
    <Chip
      label={severity}
      size="small"
      sx={{
        bgcolor: SEVERITY_COLORS[severity],
        color: 'white',
        fontWeight: 'bold',
        fontSize: '0.7rem',
      }}
    />
  );
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  const colors: Record<string, string> = { tls: '#0284c7', ssh: '#0284c7', http: '#24a148' };
  return (
    <Chip
      label={protocol.toUpperCase()}
      size="small"
      sx={{ bgcolor: colors[protocol] ?? '#6b7280', color: 'white', fontWeight: 'bold', fontSize: '0.65rem' }}
    />
  );
}

function CompliancePills({ bsiRef, doraRef, eidasRef }: { bsiRef: string; doraRef: string; eidasRef: string }) {
  return (
    <Box display="flex" gap={0.5} flexWrap="wrap">
      {bsiRef && (
        <Tooltip title={bsiRef}>
          <Chip label="BSI TR-02102" size="small" sx={{ bgcolor: '#1d4ed8', color: 'white', fontSize: '0.6rem', height: 20 }} />
        </Tooltip>
      )}
      {doraRef && (
        <Tooltip title={doraRef}>
          <Chip label="DORA Art.9" size="small" sx={{ bgcolor: '#0284c7', color: 'white', fontSize: '0.6rem', height: 20 }} />
        </Tooltip>
      )}
      {eidasRef && (
        <Tooltip title={eidasRef}>
          <Chip label="eIDAS 2.0" size="small" sx={{ bgcolor: '#0891b2', color: 'white', fontSize: '0.6rem', height: 20 }} />
        </Tooltip>
      )}
    </Box>
  );
}

// ── ScanSummaryBar ─────────────────────────────────────────────────────────────

function ScanSummaryBar({ summary }: { summary: ScanSummary }) {
  const cards = [
    { label: 'Targets Scanned', value: summary.scanned_targets, icon: '🌐', bg: '#eff6ff', color: '#1d4ed8' },
    { label: 'CRITICAL Findings', value: summary.critical, icon: '🔴', bg: '#fef2f2', color: '#dc2626' },
    { label: 'HIGH Findings', value: summary.high, icon: '🟠', bg: '#fff7ed', color: '#ea580c' },
    { label: 'Quantum-Unsafe Assets', value: summary.quantum_unsafe, icon: '⚛', bg: '#f0f9ff', color: '#0284c7' },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.label}>
          <Card sx={{ bgcolor: card.bg, border: `1px solid ${card.color}20` }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h3" fontWeight="bold" sx={{ color: card.color, lineHeight: 1 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {card.label}
                  </Typography>
                </Box>
                <Typography variant="h4">{card.icon}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ── TargetStatusGrid ───────────────────────────────────────────────────────────

function TargetStatusGrid({ findings }: { findings: Finding[] }) {
  const targets = [
    { id: 'tls-1', label: 'NGINX TLS 1.0', port: 4431, protocol: 'tls' },
    { id: 'tls-2', label: 'NGINX TLS 1.2 (Weak)', port: 4432, protocol: 'tls' },
    { id: 'tls-3', label: 'NGINX TLS 1.3 (Good)', port: 4433, protocol: 'tls' },
    { id: 'ssh-1', label: 'SSH Weak KEX', port: 2222, protocol: 'ssh' },
    { id: 'http-1', label: 'MD5 Hash API', port: 5001, protocol: 'http' },
    { id: 'tls-4', label: 'Java Legacy HTTPS', port: 8443, protocol: 'tls' },
  ];

  const getWorstSeverity = (targetId: string): SeverityLevel | null => {
    const tf = findings.filter((f) => f.target_id === targetId);
    if (tf.length === 0) return null;
    const order: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    for (const sev of order) {
      if (tf.some((f) => f.severity === sev)) return sev;
    }
    return null;
  };

  const statusIcon = (sev: SeverityLevel | null) => {
    if (!sev) return '🟢';
    const icons: Record<SeverityLevel, string> = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢', INFO: '⚪' };
    return icons[sev];
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
        Target Status
      </Typography>
      <Grid container spacing={1.5}>
        {targets.map((t) => {
          const worst = getWorstSeverity(t.id);
          const count = findings.filter((f) => f.target_id === t.id).length;
          return (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card
                sx={{
                  border: `2px solid ${worst ? SEVERITY_COLORS[worst] + '40' : '#22c55e40'}`,
                  bgcolor: worst ? SEVERITY_BG[worst] : '#f0fdf4',
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{t.label}</Typography>
                      <Box display="flex" gap={0.5} alignItems="center" mt={0.5}>
                        <ProtocolBadge protocol={t.protocol} />
                        <Typography variant="caption" color="text.secondary">:{t.port}</Typography>
                      </Box>
                    </Box>
                    <Box textAlign="right">
                      <Typography fontSize="1.8rem" lineHeight={1}>{statusIcon(worst)}</Typography>
                      {worst && (
                        <Typography variant="caption" sx={{ color: SEVERITY_COLORS[worst], fontWeight: 'bold' }}>
                          {count} finding{count !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

// ── FindingsTable ──────────────────────────────────────────────────────────────

function FindingsTable({ findings }: { findings: Finding[] }) {
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [protocolFilter, setProtocolFilter] = useState<string>('All');
  const [quantumOnly, setQuantumOnly] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = findings.filter((f) => {
    if (severityFilter !== 'All' && f.severity !== severityFilter) return false;
    if (protocolFilter !== 'All' && f.protocol !== protocolFilter) return false;
    if (quantumOnly && f.quantum_safe) return false;
    return true;
  });

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
        Findings ({filtered.length})
      </Typography>

      {/* Filters */}
      <Box display="flex" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Severity</InputLabel>
          <Select value={severityFilter} label="Severity" onChange={(e) => setSeverityFilter(e.target.value)}>
            {['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Protocol</InputLabel>
          <Select value={protocolFilter} label="Protocol" onChange={(e) => setProtocolFilter(e.target.value)}>
            {['All', 'tls', 'ssh', 'http'].map((p) => (
              <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={quantumOnly} onChange={(e) => setQuantumOnly(e.target.checked)} size="small" color="secondary" />}
          label={<Typography variant="body2">Quantum Unsafe Only</Typography>}
        />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell><Typography variant="caption" fontWeight="bold">Severity</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">Target</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">Protocol</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">Finding</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">Algorithm</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">Key Len</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">QS</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight="bold">Compliance</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((f) => (
              <React.Fragment key={f.id}>
                <TableRow
                  hover
                  onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                  sx={{ cursor: 'pointer', bgcolor: expandedRow === f.id ? '#f8fafc' : 'inherit' }}
                >
                  <TableCell><SeverityBadge severity={f.severity} /></TableCell>
                  <TableCell>
                    <Typography variant="caption">{f.target_label.split('(')[0].trim()}</Typography>
                  </TableCell>
                  <TableCell><ProtocolBadge protocol={f.protocol} /></TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="caption" fontWeight="medium">{f.title}</Typography>
                      {expandedRow === f.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="caption">{f.algorithm || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{f.key_length > 0 ? `${f.key_length}b` : '—'}</Typography></TableCell>
                  <TableCell>
                    <Tooltip title={f.quantum_safe ? 'Quantum Safe' : 'Not Quantum Safe'}>
                      <Typography>{f.quantum_safe ? '✅' : '❌'}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <CompliancePills bsiRef={f.bsi_ref} doraRef={f.dora_ref} eidasRef={f.eidas_ref} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 0, border: expandedRow === f.id ? undefined : 'none' }}>
                    <Collapse in={expandedRow === f.id} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, my: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{f.description}</Typography>
                        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                          <strong>Evidence:</strong> {f.evidence}
                        </Typography>
                        <Typography variant="caption" component="div">
                          <strong>Remediation:</strong> {f.remediation}
                        </Typography>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── ScanButton ────────────────────────────────────────────────────────────────

const SCAN_STEPS = [
  '🔍 Connecting to NGINX TLS 1.0 (port 4431)...',
  '⚠️  CRITICAL: TLS 1.0 detected on port 4431',
  '⚠️  CRITICAL: RC4 cipher suite detected',
  '🔍 Connecting to NGINX TLS 1.2 (port 4432)...',
  '⚠️  HIGH: No forward secrecy on port 4432',
  '🔍 Checking SSH server (port 2222)...',
  '⚠️  CRITICAL: DSA host key detected',
  '⚠️  HIGH: Weak KEX (group1-sha1) offered',
  '🔍 Probing MD5 Hash API (port 5001)...',
  '⚠️  MEDIUM: Missing HSTS header',
  '🔍 Connecting to Java Legacy HTTPS (port 8443)...',
  '⚠️  CRITICAL: RSA-512 key detected',
  '✅ NGINX TLS 1.3 (port 4433) — No critical findings',
  '📊 Aggregating findings...',
  '✅ Scan complete!',
];

interface ScanButtonProps {
  onScanComplete: (result: ScanResult) => void;
}

function ScanButton({ onScanComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setSteps([]);
    setError(null);

    // Show simulated progress
    for (let i = 0; i < SCAN_STEPS.length - 1; i++) {
      await new Promise((r) => setTimeout(r, 400));
      setSteps((prev) => [...prev, SCAN_STEPS[i]]);
    }

    try {
      const resp = await fetch('/api/v1/demo/scan');
      if (resp.ok) {
        const data: ScanResult = await resp.json();
        setSteps((prev) => [...prev, '✅ Live scan complete!']);
        onScanComplete(data);
      } else {
        // Fall back to seeded data
        setSteps((prev) => [...prev, '📄 Using seeded demo findings (backend not running)']);
        onScanComplete({
          scan_id: 'demo-local',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          findings: SEED_FINDINGS,
          summary: SEED_SUMMARY,
        });
      }
    } catch {
      setSteps((prev) => [...prev, '📄 Using seeded demo findings (backend not running)']);
      onScanComplete({
        scan_id: 'demo-local',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        findings: SEED_FINDINGS,
        summary: SEED_SUMMARY,
      });
    }

    setScanning(false);
  }, [onScanComplete]);

  return (
    <Box sx={{ mb: 3 }}>
      <Button
        variant="contained"
        startIcon={scanning ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
        onClick={handleScan}
        disabled={scanning}
        sx={{
          background: 'linear-gradient(45deg, #0284c7 30%, #0284c7 90%)',
          color: 'white',
          fontWeight: 'bold',
          px: 3,
        }}
      >
        {scanning ? 'Scanning infrastructure...' : 'Run Live Scan'}
      </Button>

      {scanning && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}

      {steps.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: '#0f172a', maxHeight: 200, overflow: 'auto' }}>
          {steps.map((step, i) => (
            <Typography key={i} variant="caption" display="block" sx={{ color: step.startsWith('⚠️') ? '#fbbf24' : step.startsWith('✅') ? '#34d399' : '#94a3b8', fontFamily: 'monospace' }}>
              {step}
            </Typography>
          ))}
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const InfraDiscovery: React.FC = () => {
  const [findings, setFindings] = useState<Finding[]>(SEED_FINDINGS);
  const [summary, setSummary] = useState<ScanSummary>(SEED_SUMMARY);
  const [lastScanId, setLastScanId] = useState<string>('demo-fixtures-v1');

  const handleScanComplete = useCallback((result: ScanResult) => {
    setFindings(result.findings);
    setSummary(result.summary);
    setLastScanId(result.scan_id);
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
          <NetworkCheck sx={{ color: '#0284c7', fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            Infrastructure Discovery — Weak Cryptography
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Real-time scanning of network endpoints for cryptographic vulnerabilities |{' '}
          <strong>BSI TR-02102-2</strong> · <strong>eIDAS 2.0</strong> · <strong>DORA</strong>
        </Typography>
        {lastScanId && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Scan ID: {lastScanId}
          </Typography>
        )}
      </Box>

      {/* Scan Button */}
      <ScanButton onScanComplete={handleScanComplete} />

      {/* Summary Bar */}
      <ScanSummaryBar summary={summary} />

      {/* Target Status Grid */}
      <TargetStatusGrid findings={findings} />

      {/* Findings Table */}
      <FindingsTable findings={findings} />
    </Box>
  );
};

export default InfraDiscovery;
