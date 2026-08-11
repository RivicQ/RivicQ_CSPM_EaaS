import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Stack,
  TextField,
  InputAdornment,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search,
  GitHub,
  OpenInNew,
  Category,
} from '@mui/icons-material';
import { ecosystemService } from '../services/api';

interface EcosystemTool {
  id: string;
  name: string;
  category: string;
  description: string;
  edition: 'oss' | 'enterprise' | 'both';
  status: 'available' | 'coming_soon' | 'beta' | 'enterprise_only';
  type: 'sdk' | 'cli' | 'plugin' | 'service' | 'integration';
  docs_url?: string;
  repo_url?: string;
  install_cmd?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'sdk', label: 'SDKs & Libraries' },
  { id: 'cli', label: 'CLI & Scanner' },
  { id: 'plugin', label: 'Plugins' },
  { id: 'service', label: 'Cloud Services' },
  { id: 'integration', label: 'Integrations' },
];

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  beta: '#eab308',
  coming_soon: '#6b7280',
  enterprise_only: '#a855f7',
};

const RivicQEcosystem: React.FC = () => {
  const [tools, setTools] = useState<EcosystemTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await ecosystemService.getTools();
        setTools(resp.data.tools || []);
      } catch {
        setTools(TOOLS_DATA);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = tools.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
          <Category sx={{ color: '#6366f1', fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            RivicQ Ecosystem
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Open source tools, SDKs, and services spanning OSS to Enterprise — scan, inventory, attest, and migrate cryptographic assets.
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
          }}
          sx={{ minWidth: 260 }}
        />
        <Tabs value={category} onChange={(_, v) => setCategory(v)} variant="scrollable" scrollButtons="auto">
          {CATEGORIES.map((c) => <Tab key={c.id} value={c.id} label={c.label} />)}
        </Tabs>
      </Stack>

      <Grid container spacing={2}>
        {filtered.map((tool) => (
          <Grid item xs={12} sm={6} md={4} key={tool.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: `1px solid ${STATUS_COLORS[tool.status]}22` }}>
              <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {tool.name}
                      </Typography>
                      <Chip
                        label={tool.type.toUpperCase()}
                        size="small"
                        sx={{ fontSize: '0.65rem', bgcolor: '#6366f120', color: '#6366f1', fontWeight: 600, mt: 0.5 }}
                      />
                    </Box>
                    <Tooltip title={tool.status.replace('_', ' ').toUpperCase()}>
                      <Chip
                        label={tool.status === 'available' ? 'OSS' : tool.status === 'enterprise_only' ? 'Enterprise' : tool.status.replace('_', ' ')}
                        size="small"
                        sx={{ bgcolor: STATUS_COLORS[tool.status] + '22', color: STATUS_COLORS[tool.status], fontWeight: 600, fontSize: '0.65rem' }}
                      />
                    </Tooltip>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
                    {tool.description}
                  </Typography>

                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    <Chip label={tool.edition === 'both' ? 'OSS + Enterprise' : tool.edition === 'oss' ? 'OSS' : 'Enterprise'} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />
                  </Box>

                  {tool.install_cmd && (
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: '#0f172a', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace', display: 'block', fontSize: '0.65rem' }}>
                        {tool.install_cmd}
                      </Typography>
                    </Paper>
                  )}

                  <Box display="flex" gap={1} sx={{ mt: 'auto' }}>
                    {tool.docs_url && (
                      <Button size="small" startIcon={<OpenInNew />} href={tool.docs_url} target="_blank" sx={{ fontSize: '0.7rem' }}>
                        Docs
                      </Button>
                    )}
                    {tool.repo_url && (
                      <Button size="small" startIcon={<GitHub />} href={tool.repo_url} target="_blank" sx={{ fontSize: '0.7rem' }}>
                        Repo
                      </Button>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No tools found matching your criteria.
        </Alert>
      )}

      <Divider sx={{ my: 4 }} />

      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Edition Coverage
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell><Typography variant="caption" fontWeight="bold">Category</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight="bold">OSS</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight="bold">Enterprise</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                { category: 'CBOM Scanning', oss: 'Core TLS/SSH/HTTP/SBOM scanning', ent: 'Full + ML-based threat detection' },
                { category: 'Compliance', oss: 'DORA, NIS2, NIST-CSF, CRA, ENISA', ent: 'ISO 27001, SOC 2, PCI DSS, HIPAA, GDPR, FedRAMP' },
                { category: 'Quantum', oss: 'PQC risk scoring, migration roadmap', ent: 'IBM Quantum attestation, ML-DSA/ML-KEM generation' },
                { category: 'Cloud', oss: '—', ent: 'AWS CloudHSM, GCP KMS, IBM HPCS, Azure' },
                { category: 'SSO / Auth', oss: 'JWT, Google OAuth, demo mode', ent: 'SAML, LDAP, OAuth, API keys, RBAC' },
                { category: 'Monitoring', oss: 'Prometheus, Grafana, Jaeger', ent: '+ Splunk, Datadog' },
                { category: 'SDKs', oss: 'Python (cryptobom-core)', ent: 'Java, Rust, C++, C, Ruby' },
                { category: 'Kubernetes', oss: 'Cluster scanning, Cilium/eBPF', ent: 'Operator, Headlamp plugin, quantum scanning' },
              ].map((row) => (
                <TableRow key={row.category} hover>
                  <TableCell><Typography variant="body2" fontWeight="medium">{row.category}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{row.oss}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{row.ent}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

const TOOLS_DATA: EcosystemTool[] = [
  // SDKs & Libraries
  { id: 'sdk-py', name: 'cryptobom-core (Python)', category: 'sdk', description: 'Python SDK for CBOM scanning, quantum risk assessment, and PQC migration planning.', edition: 'both', status: 'available', type: 'sdk', docs_url: 'https://docs.rivicq.com/python', repo_url: 'https://github.com/rivic-q/cryptobom-python', install_cmd: 'pip install cryptobom-core' },
  { id: 'sdk-java', name: 'cryptobom-enterprise (Java)', category: 'sdk', description: 'Java SDK for enterprise-grade CBOM generation, IBM Quantum attestation, multi-cloud scanning.', edition: 'enterprise', status: 'enterprise_only', type: 'sdk', docs_url: 'https://docs.rivicq.com/java', install_cmd: 'mvn dependency:copy -Dartifact=com.rivicq:cryptobom-enterprise:1.3.0' },
  { id: 'sdk-rust', name: 'cryptobom-enterprise (Rust)', category: 'sdk', description: 'Rust crate for high-performance cryptographic asset scanning with quantum provider integration.', edition: 'enterprise', status: 'enterprise_only', type: 'sdk', install_cmd: 'cargo install cryptobom-enterprise --features quantum' },
  { id: 'sdk-cpp', name: 'cryptobom-cpp', category: 'sdk', description: 'C++ library for embedded CBOM scanning in native applications and IoT firmware.', edition: 'enterprise', status: 'beta', type: 'sdk', repo_url: 'https://github.com/rivicq/cryptobom-cpp' },
  { id: 'sdk-c', name: 'libcryptobom (C)', category: 'sdk', description: 'C library for lightweight cryptographic discovery in constrained environments.', edition: 'enterprise', status: 'beta', type: 'sdk', install_cmd: 'wget https://github.com/rivicq/cryptobom-c/releases/download/v1.3.0/libcryptobom.so' },
  { id: 'sdk-ruby', name: 'cryptobom-enterprise (Ruby)', category: 'sdk', description: 'Ruby gem for CBOM generation and compliance reporting in Rails applications.', edition: 'enterprise', status: 'enterprise_only', type: 'sdk', install_cmd: 'gem install cryptobom-enterprise' },

  // CLI & Scanner
  { id: 'cli-oss', name: 'CryptoBOM Scanner (OSS)', category: 'cli', description: 'Standalone CLI for TLS/SSH/HTTP cryptographic discovery and SBOM generation.', edition: 'oss', status: 'available', type: 'cli', repo_url: 'https://github.com/rivic-q/cryptobom-saas', install_cmd: 'go install github.com/rivic-q/cryptobom-saas/cmd/scanner@latest' },
  { id: 'cli-enterprise', name: 'CryptoBOM Scanner (Enterprise)', category: 'cli', description: 'Enterprise CLI with multi-cloud HSM scanning, quantum attestation, and ML threat detection.', edition: 'enterprise', status: 'enterprise_only', type: 'cli', install_cmd: 'docker pull rivic-q/cryptobom-enterprise:latest' },
  { id: 'cli-demo', name: 'Infrastructure Discovery Scanner', category: 'cli', description: 'Demo scanner for weak crypto discovery across TLS, SSH, and HTTP endpoints.', edition: 'both', status: 'available', type: 'cli', repo_url: 'https://github.com/rivic-q/cryptobom-saas', install_cmd: 'make build-scanner && ./bin/cryptobom-scanner' },

  // Plugins
  { id: 'plugin-headlamp', name: 'Headlamp Plugin', category: 'plugin', description: 'Kubernetes cluster crypto dashboard — visualize CBOM data, quantum risk, and compliance status directly in Headlamp.', edition: 'both', status: 'available', type: 'plugin', docs_url: 'https://docs.rivicq.com/headlamp', repo_url: 'https://github.com/rivic-q/cryptobom-headlamp-plugin' },
  { id: 'plugin-k8s-operator', name: 'Kubernetes Operator', category: 'plugin', description: 'Automated CBOM scanning for Kubernetes clusters — detects cryptographic assets in pods, services, and secrets.', edition: 'enterprise', status: 'enterprise_only', type: 'plugin', repo_url: 'https://github.com/rivic-q/cryptobom-operator' },

  // Cloud Services
  { id: 'cloud-aws', name: 'AWS Cloud Integration', category: 'service', description: 'CloudHSM cluster status, KMS key inventory, CloudTrail cryptographic event auditing.', edition: 'enterprise', status: 'enterprise_only', type: 'service', docs_url: 'https://docs.rivicq.com/aws' },
  { id: 'cloud-gcp', name: 'GCP Cloud Integration', category: 'service', description: 'Cloud KMS key management, GKE workload crypto scanning, HSM key ring attestation.', edition: 'enterprise', status: 'enterprise_only', type: 'service', docs_url: 'https://docs.rivicq.com/gcp' },
  { id: 'cloud-ibm', name: 'IBM Cloud HPCS', category: 'service', description: 'Hyper Protect Crypto Service key management, COS bucket attestation, quantum-safe key generation.', edition: 'enterprise', status: 'enterprise_only', type: 'service', docs_url: 'https://docs.rivicq.com/ibm' },
  { id: 'cloud-azure', name: 'Azure Cloud Integration', category: 'service', description: 'Azure Key Vault, managed HSM, and cryptographic asset inventory scanning.', edition: 'enterprise', status: 'enterprise_only', type: 'service' },
  { id: 'quantum-ibm', name: 'IBM Quantum Attestation', category: 'service', description: 'Quantum network attestation for CBOM reports — validates PQC readiness against IBM Quantum systems.', edition: 'enterprise', status: 'enterprise_only', type: 'service', docs_url: 'https://docs.rivicq.com/quantum' },

  // Integrations
  { id: 'int-cncf-prometheus', name: 'Prometheus', category: 'integration', description: 'Scrape cryptographic asset metrics, quantum risk scores, and compliance status.', edition: 'both', status: 'available', type: 'integration', docs_url: 'https://prometheus.io/docs' },
  { id: 'int-cncf-grafana', name: 'Grafana', category: 'integration', description: 'Pre-built CBOM compliance dashboards with DORA, NIS2, and quantum risk visualizations.', edition: 'both', status: 'available', type: 'integration', docs_url: 'https://grafana.com/docs' },
  { id: 'int-cncf-argocd', name: 'ArgoCD', category: 'integration', description: 'GitOps deployment with CBOM compliance gates — block deployments with critical crypto findings.', edition: 'enterprise', status: 'enterprise_only', type: 'integration' },
  { id: 'int-cncf-flux', name: 'Flux', category: 'integration', description: 'Continuous delivery with automated CBOM scanning on cluster sync.', edition: 'enterprise', status: 'enterprise_only', type: 'integration' },
  { id: 'int-cncf-cilium', name: 'Cilium / eBPF', category: 'integration', description: 'Real-time cryptographic flow monitoring via eBPF — detect TLS/SSH algorithm usage in live traffic.', edition: 'both', status: 'available', type: 'integration', docs_url: 'https://docs.cilium.io' },
  { id: 'int-devsecops-trivy', name: 'Trivy', category: 'integration', description: 'Container and filesystem vulnerability scanning with CBOM enrichment.', edition: 'oss', status: 'available', type: 'integration', docs_url: 'https://aquasecurity.github.io/trivy' },
  { id: 'int-devsecops-syft', name: 'Syft', category: 'integration', description: 'SBOM generation for containers and filesystems — import into CryptoBOM for crypto analysis.', edition: 'oss', status: 'available', type: 'integration', repo_url: 'https://github.com/anchore/syft' },
  { id: 'int-devsecops-codeql', name: 'CodeQL', category: 'integration', description: 'Static analysis for cryptographic misuse in source code — detect weak algorithms, hardcoded keys.', edition: 'both', status: 'available', type: 'integration', docs_url: 'https://codeql.github.com/docs' },
  { id: 'int-compliance-delve', name: 'Delve Compliance', category: 'integration', description: 'Automated compliance evidence collection for DORA, NIS2, and SOC 2 frameworks.', edition: 'enterprise', status: 'enterprise_only', type: 'integration' },
  { id: 'int-compliance-kertos', name: 'Kertos GRC', category: 'integration', description: 'Governance, risk, and compliance platform integration for centralized audit reporting.', edition: 'enterprise', status: 'enterprise_only', type: 'integration' },
  { id: 'int-observability-splunk', name: 'Splunk', category: 'integration', description: 'Forward CBOM security events and quantum risk scores to Splunk for SIEM correlation.', edition: 'enterprise', status: 'enterprise_only', type: 'integration' },
  { id: 'int-observability-datadog', name: 'Datadog', category: 'integration', description: 'Monitor CBOM metrics alongside infrastructure telemetry in Datadog dashboards.', edition: 'enterprise', status: 'enterprise_only', type: 'integration' },
];

export default RivicQEcosystem;
