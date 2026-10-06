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
  PlayArrow,
  ExpandMore,
  ExpandLess,
  ErrorOutline,
  WarningAmber,
  Psychology,
  Language,
  CheckCircle,
  Cancel,
  Terminal,
} from '@mui/icons-material';
import PageFrame from '../components/PageFrame';
import { tokens } from '../theme/tokens';

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

// ── Seed fixtures ─────────────────────────────────────────────────────────────

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

// ── Severity / protocol styling ───────────────────────────────────────────────

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  CRITICAL: tokens.colors.crypto.critical,
  HIGH: tokens.colors.crypto.high,
  MEDIUM: tokens.colors.crypto.medium,
  LOW: tokens.colors.crypto.low,
  INFO: tokens.colors.crypto.classic,
};

function tintedChip(color: string, label: React.ReactNode, size: 'small' | 'medium' = 'small') {
  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: `${color}14`,
        color,
        border: `1px solid ${color}44`,
        fontWeight: 600,
        letterSpacing: '0.04em',
        fontSize: '0.66rem',
        height: 20,
      }}
    />
  );
}

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  return tintedChip(SEVERITY_COLORS[severity], severity);
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  const color = protocol === 'http' ? tokens.colors.crypto.low : tokens.colors.rivicq[400];
  return tintedChip(color, protocol.toUpperCase());
}

function CompliancePills({ bsiRef, doraRef, eidasRef }: { bsiRef: string; doraRef: string; eidasRef: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {bsiRef && (
        <Tooltip title={bsiRef}>{tintedChip(tokens.colors.rivicq[400], 'BSI TR-02102')}</Tooltip>
      )}
      {doraRef && (
        <Tooltip title={doraRef}>{tintedChip(tokens.colors.rivicq[500], 'DORA Art.9')}</Tooltip>
      )}
      {eidasRef && (
        <Tooltip title={eidasRef}>{tintedChip(tokens.colors.crypto.low, 'eIDAS 2.0')}</Tooltip>
      )}
    </Box>
  );
}

// ── Scan summary cards ─────────────────────────────────────────────────────────

function ScanSummaryBar({ summary }: { summary: ScanSummary }) {
  const cards = [
    { label: 'Targets scanned', value: summary.scanned_targets, icon: <Language />, color: tokens.colors.rivicq[400] },
    { label: 'Critical findings', value: summary.critical, icon: <ErrorOutline />, color: tokens.colors.crypto.critical },
    { label: 'High findings', value: summary.high, icon: <WarningAmber />, color: tokens.colors.crypto.high },
    { label: 'Quantum-unsafe assets', value: summary.quantum_unsafe, icon: <Psychology />, color: tokens.colors.crypto.quantum },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.label}>
          <Card sx={{ bgcolor: '#0a0a0f', border: '1px solid #1f1f2e' }}>
            <CardContent sx={{ py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h3" fontWeight={700} sx={{ color: card.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {card.label}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: `${tokens.borderRadius.sm}px`,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: `${card.color}18`,
                  color: card.color,
                  '& svg': { fontSize: 18 },
                }}
              >
                {card.icon}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ── Target status grid ─────────────────────────────────────────────────────────

const TARGETS = [
  { id: 'tls-1', label: 'NGINX TLS 1.0', port: 4431, protocol: 'tls' },
  { id: 'tls-2', label: 'NGINX TLS 1.2 (Weak)', port: 4432, protocol: 'tls' },
  { id: 'tls-3', label: 'NGINX TLS 1.3 (Good)', port: 4433, protocol: 'tls' },
  { id: 'ssh-1', label: 'SSH Weak KEX', port: 2222, protocol: 'ssh' },
  { id: 'http-1', label: 'MD5 Hash API', port: 5001, protocol: 'http' },
  { id: 'tls-4', label: 'Java Legacy HTTPS', port: 8443, protocol: 'tls' },
];

function TargetStatusGrid({ findings }: { findings: Finding[] }) {
  const getWorstSeverity = (targetId: string): SeverityLevel | null => {
    const tf = findings.filter((f) => f.target_id === targetId);
    if (tf.length === 0) return null;
    const order: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    return order.find((sev) => tf.some((f) => f.severity === sev)) ?? null;
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Target status
      </Typography>
      <Grid container spacing={1.5}>
        {TARGETS.map((t) => {
          const worst = getWorstSeverity(t.id);
          const color = worst ? SEVERITY_COLORS[worst] : tokens.colors.crypto.classic;
          const count = findings.filter((f) => f.target_id === t.id).length;
          return (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: worst ? `${color}0d` : '#0a0a0f',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: color,
                  },
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{t.label}</Typography>
                      <Box display="flex" gap={0.5} alignItems="center" mt={0.5}>
                        <ProtocolBadge protocol={t.protocol} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: tokens.typography.mono }}>
                          :{t.port}
                        </Typography>
                      </Box>
                    </Box>
                    <Box textAlign="right">
                      {worst ? (
                        <>
                          <Typography variant="caption" sx={{ color, fontWeight: 700, letterSpacing: '0.06em' }}>
                            {worst}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {count} finding{count !== 1 ? 's' : ''}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" sx={{ color: tokens.colors.crypto.success, fontWeight: 700 }}>
                          NO FINDINGS
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

// ── Findings table ──────────────────────────────────────────────────────────────

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
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        Findings ({filtered.length})
      </Typography>

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
          label={<Typography variant="body2">Quantum unsafe only</Typography>}
        />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Severity</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Protocol</TableCell>
              <TableCell>Finding</TableCell>
              <TableCell>Algorithm</TableCell>
              <TableCell>Key Len</TableCell>
              <TableCell>QS</TableCell>
              <TableCell>Compliance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((f) => (
              <React.Fragment key={f.id}>
                <TableRow
                  hover
                  onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                  sx={{ cursor: 'pointer', bgcolor: expandedRow === f.id ? 'action.hover' : 'transparent' }}
                >
                  <TableCell><SeverityBadge severity={f.severity} /></TableCell>
                  <TableCell>
                    <Typography variant="caption">{f.target_label.split('(')[0].trim()}</Typography>
                  </TableCell>
                  <TableCell><ProtocolBadge protocol={f.protocol} /></TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="caption" fontWeight={600}>{f.title}</Typography>
                      {expandedRow === f.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {f.algorithm ? (
                      <Typography variant="caption" sx={{ fontFamily: tokens.typography.mono }}>{f.algorithm}</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: tokens.typography.mono }}>
                      {f.key_length > 0 ? `${f.key_length}b` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={f.quantum_safe ? 'Quantum safe' : 'Not quantum safe'}>
                      {f.quantum_safe ? (
                        <CheckCircle sx={{ fontSize: 16, color: tokens.colors.crypto.success }} />
                      ) : (
                        <Cancel sx={{ fontSize: 16, color: tokens.colors.crypto.critical }} />
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <CompliancePills bsiRef={f.bsi_ref} doraRef={f.dora_ref} eidasRef={f.eidas_ref} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 0, border: expandedRow === f.id ? undefined : 'none' }}>
                    <Collapse in={expandedRow === f.id} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', my: 1, borderRadius: `${tokens.borderRadius.sm}px`, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{f.description}</Typography>
                        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                          <strong>Evidence:</strong> <Box component="span" sx={{ fontFamily: tokens.typography.mono }}>{f.evidence}</Box>
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

// ── Scan progress stream ────────────────────────────────────────────────────────

type ScanEvent =
  | { kind: 'connect'; text: string }
  | { kind: 'finding'; severity: SeverityLevel; text: string }
  | { kind: 'good'; text: string }
  | { kind: 'note'; text: string };

const SCAN_EVENTS: ScanEvent[] = [
  { kind: 'connect', text: 'Connecting to NGINX TLS 1.0 (port 4431)' },
  { kind: 'finding', severity: 'CRITICAL', text: 'TLS 1.0 detected on port 4431' },
  { kind: 'finding', severity: 'CRITICAL', text: 'RC4 cipher suite detected' },
  { kind: 'connect', text: 'Connecting to NGINX TLS 1.2 (port 4432)' },
  { kind: 'finding', severity: 'HIGH', text: 'No forward secrecy on port 4432' },
  { kind: 'connect', text: 'Checking SSH server (port 2222)' },
  { kind: 'finding', severity: 'CRITICAL', text: 'DSA host key detected' },
  { kind: 'finding', severity: 'HIGH', text: 'Weak KEX (group1-sha1) offered' },
  { kind: 'connect', text: 'Probing MD5 Hash API (port 5001)' },
  { kind: 'finding', severity: 'MEDIUM', text: 'Missing HSTS header' },
  { kind: 'connect', text: 'Connecting to Java Legacy HTTPS (port 8443)' },
  { kind: 'finding', severity: 'CRITICAL', text: 'RSA-512 key detected' },
  { kind: 'good', text: 'NGINX TLS 1.3 (port 4433) — no critical findings' },
  { kind: 'note', text: 'Aggregating findings' },
];

function eventColor(event: ScanEvent): string {
  switch (event.kind) {
    case 'finding':
      return SEVERITY_COLORS[event.severity];
    case 'good':
      return tokens.colors.crypto.success;
    case 'note':
      return tokens.colors.textLight.muted;
    default:
      return tokens.colors.rivicq[400];
  }
}

interface ScanButtonProps {
  onScanComplete: (result: ScanResult) => void;
}

function ScanButton({ onScanComplete }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setEvents([]);
    setError(null);

    for (let i = 0; i < SCAN_EVENTS.length; i++) {
      await new Promise((r) => setTimeout(r, 340));
      setEvents((prev) => [...prev, SCAN_EVENTS[i]]);
    }

    try {
      const resp = await fetch('/api/v1/demo/scan');
      if (resp.ok) {
        const data: ScanResult = await resp.json();
        setEvents((prev) => [...prev, { kind: 'good', text: 'Live scan complete' }]);
        onScanComplete(data);
      } else {
        setEvents((prev) => [...prev, { kind: 'note', text: 'Using seeded demo findings (backend not running)' }]);
        onScanComplete({
          scan_id: 'demo-local',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          findings: SEED_FINDINGS,
          summary: SEED_SUMMARY,
        });
      }
    } catch {
      setEvents((prev) => [...prev, { kind: 'note', text: 'Using seeded demo findings (backend not running)' }]);
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
        sx={{ px: 3 }}
      >
        {scanning ? 'Scanning infrastructure…' : 'Run live scan'}
      </Button>

      {scanning && <LinearProgress sx={{ mt: 1.5 }} />}

      {events.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            borderColor: 'divider',
            bgcolor: '#05050a',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: '#0a0a0f',
            }}
          >
            <Terminal sx={{ fontSize: 13, color: tokens.colors.rivicq[400] }} />
            <Typography variant="caption" sx={{ fontFamily: tokens.typography.mono, color: 'text.secondary', letterSpacing: '0.08em' }}>
              rivicq discover --network localhost --ports 2222,4431,4432,4433,5001,8443
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, maxHeight: 220, overflow: 'auto', fontFamily: tokens.typography.mono, fontSize: '0.72rem' }}>
            {events.map((event, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: 1, py: 0.15 }}>
                <Box component="span" sx={{ color: 'text.disabled', userSelect: 'none' }}>
                  {String(i + 1).padStart(2, '0')}
                </Box>
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: eventColor(event),
                    alignSelf: 'center',
                    flexShrink: 0,
                  }}
                />
                <Box
                  component="span"
                  sx={{
                    color: eventColor(event),
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {event.text}
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
    <PageFrame
      eyebrow="Labeled sample fixtures"
      title="Infrastructure discovery"
      subtitle="Network cryptographic discovery. The table below is labeled sample data until you run a live scan against the RivicQ engine. Mappings are not certifications."
    >
      <Alert severity="info" sx={{ mb: 2.5 }}>
        Seed rows are fixtures, not a customer estate. Live scanning needs the Community API.
        {' '}
        <Box
          component="span"
          sx={{
            fontFamily: tokens.typography.mono,
            fontSize: '0.72rem',
            color: 'text.secondary',
          }}
        >
          source: {lastScanId}
        </Box>
      </Alert>
      <ScanButton onScanComplete={handleScanComplete} />
      <ScanSummaryBar summary={summary} />
      <TargetStatusGrid findings={findings} />
      <FindingsTable findings={findings} />
    </PageFrame>
  );
};

export default InfraDiscovery;