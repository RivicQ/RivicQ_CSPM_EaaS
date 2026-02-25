import React, { useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  LinearProgress,
} from "@mui/material"
import {
  CheckCircle,
  Cancel,
  ExpandMore,
  Security,
  Psychology,
  Cloud,
  Storage,
  Assessment,
  Speed,
  Shield,
  Code,
  Rocket,
  Star,
  Lock,
  GitHub,
  Business,
  ArrowForward,
  OpenInNew,
  CloudQueue,
  Analytics,
} from "@mui/icons-material"

// ── Data ─────────────────────────────────────────────────────────────────────

const APP_VERSION = "v1.3"

const OSS_FEATURES = [
  {
    icon: <Security />,
    title: "eBPF Asset Discovery",
    desc: "Real-time cryptographic asset detection via eBPF system-call hooking",
    color: "#667eea",
  },
  {
    icon: <Storage />,
    title: "CBOM Management",
    desc: "Create, version and track Cryptographic Bills of Materials",
    color: "#10b981",
  },
  {
    icon: <Shield />,
    title: "Vulnerability Detection",
    desc: "Identify weak algorithms, deprecated keys and misconfigurations",
    color: "#f59e0b",
  },
  {
    icon: <CloudQueue />,
    title: "Kubernetes Integration",
    desc: "Scan pods, secrets and TLS certificates across namespaces",
    color: "#3b82f6",
  },
  {
    icon: <Analytics />,
    title: "Prometheus / Grafana",
    desc: "Built-in observability with pre-configured dashboards",
    color: "#8b5cf6",
  },
  {
    icon: <Code />,
    title: "REST API (port 8080)",
    desc: "Full OpenAPI spec, 100 req/hr rate limit, JWT auth",
    color: "#06b6d4",
  },
]

const ENTERPRISE_FEATURES = [
  {
    icon: <Psychology />,
    title: "IBM Quantum Integration",
    desc: "Real quantum attestation via IBM Quantum Network with Qiskit circuits",
    color: "#7c3aed",
  },
  {
    icon: <Shield />,
    title: "Post-Quantum Attestation",
    desc: "CRYSTALS-Kyber, Dilithium, FALCON, SPHINCS+ with FIPS 203/204/205",
    color: "#ef4444",
  },
  {
    icon: <Cloud />,
    title: "Multi-Cloud Support",
    desc: "AWS, IBM Cloud, Azure, GCP — unified crypto posture across all",
    color: "#f59e0b",
  },
  {
    icon: <Lock />,
    title: "Enterprise SSO",
    desc: "SAML 2.0, LDAP, OAuth 2.0 / OIDC identity federation",
    color: "#10b981",
  },
  {
    icon: <Assessment />,
    title: "ML Threat Detection",
    desc: "AI-powered anomaly detection and quantum vulnerability forecasting",
    color: "#3b82f6",
  },
  {
    icon: <Speed />,
    title: "Advanced API (port 9090)",
    desc: "1 000 req/hr, mTLS, enterprise RBAC and audit trails",
    color: "#667eea",
  },
  {
    icon: <Business />,
    title: "German Engineering Quality",
    desc: "TÜV SÜD certified, ISO 9001:2015, ISO 27001:2022, GDPR / DSGVO",
    color: "#dc2626",
  },
  {
    icon: <Star />,
    title: "24/7 Enterprise Support",
    desc: "99.9% SLA, dedicated Berlin-based quantum engineering team",
    color: "#d97706",
  },
]

const COMPARISON_ROWS = [
  { feature: "CBOM Management", oss: true, enterprise: true },
  { feature: "eBPF Asset Discovery", oss: true, enterprise: true },
  { feature: "Vulnerability Detection", oss: true, enterprise: true },
  { feature: "Kubernetes Integration", oss: true, enterprise: true },
  { feature: "Prometheus / Grafana", oss: true, enterprise: true },
  { feature: "REST API", oss: true, enterprise: true },
  { feature: "IBM Quantum Integration", oss: false, enterprise: true },
  { feature: "Post-Quantum Attestation", oss: false, enterprise: true },
  { feature: "ML Threat Detection", oss: false, enterprise: true },
  { feature: "Multi-Cloud Support", oss: false, enterprise: true },
  { feature: "Enterprise SSO (SAML/LDAP)", oss: false, enterprise: true },
  { feature: "Advanced Analytics & ML", oss: false, enterprise: true },
  { feature: "Quantum Forecasting", oss: false, enterprise: true },
  { feature: "German Engineering / TÜV", oss: false, enterprise: true },
  { feature: "24/7 Premium Support + SLA", oss: false, enterprise: true },
  { feature: "API Rate Limit", oss: false, enterprise: true, ossLabel: "100/hr", entLabel: "1 000/hr" },
  { feature: "Deployment Port", oss: false, enterprise: true, ossLabel: "8080", entLabel: "9090" },
]

const MIGRATION_STEPS = [
  { step: 1, title: "Backup OSS data", detail: "Export your CBOM database and asset inventory" },
  { step: 2, title: "Deploy Enterprise", detail: "Use enterprise deployment scripts or Helm chart" },
  { step: 3, title: "Import data", detail: "POST /api/v1/migration/import to migrate CBOM data" },
  { step: 4, title: "Enable IBM Quantum", detail: "Set IBMQ_API_KEY and run first attestation pass" },
  { step: 5, title: "Activate features", detail: "Enable ML detection, SSO and multi-cloud connectors" },
  { step: 6, title: "Verify compliance", detail: "Run full quantum attestation against all assets" },
]

const LANGUAGES = [
  { lang: "Python", badge: "#3776ab", response: "45 ms", mem: "128 MB", quantum: "Qiskit + Qiskit-Nature" },
  { lang: "Java", badge: "#ed8b00", response: "35 ms", mem: "256 MB", quantum: "Quantum SDK" },
  { lang: "Rust", badge: "#ce422b", response: "12 ms", mem: "64 MB", quantum: "Quantum Rust" },
  { lang: "C++", badge: "#659ad2", response: "15 ms", mem: "96 MB", quantum: "Quantum C++" },
  { lang: "C", badge: "#555555", response: "18 ms", mem: "80 MB", quantum: "System Quantum" },
  { lang: "Ruby", badge: "#cc342d", response: "55 ms", mem: "180 MB", quantum: "Quantum Ruby" },
]

const COMPLIANCE_SCORES = [
  { label: "BSI TR-02102", score: 88 },
  { label: "DORA", score: 92 },
  { label: "eIDAS 2.0", score: 79 },
  { label: "FIPS 140-3", score: 85 },
  { label: "ISO 27001", score: 91 },
  { label: "NIST PQC", score: 94 },
]

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; subtitle: string; accent?: string }> = ({
  title,
  subtitle,
  accent = "#667eea",
}) => (
  <Box sx={{ mb: 4, textAlign: "center" }}>
    <Typography
      variant="h4"
      fontWeight="bold"
      sx={{ background: `linear-gradient(45deg, ${accent}, #764ba2)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
    >
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
      {subtitle}
    </Typography>
  </Box>
)

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string }> = ({
  icon,
  title,
  desc,
  color,
}) => (
  <Card sx={{ height: "100%", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
    <CardContent>
      <Avatar sx={{ bgcolor: color + "20", color, mb: 2, width: 48, height: 48 }}>{icon}</Avatar>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {desc}
      </Typography>
    </CardContent>
  </Card>
)

// ── Main Page ─────────────────────────────────────────────────────────────────

const ProjectPreview: React.FC = () => {
  const [accordionOpen, setAccordionOpen] = useState<string | false>("panel1")

  const handleAccordion = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setAccordionOpen(isExpanded ? panel : false)
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", pb: 6 }}>
      {/* ── Hero ── */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 3,
          p: { xs: 4, md: 6 },
          mb: 5,
          color: "white",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <Chip label={APP_VERSION} color="default" size="small" sx={{ mb: 2, bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          🔐 CryptoBOM SaaS
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 3, maxWidth: 720, mx: "auto" }}>
          Quantum-Safe DevSecOps Platform · Complete Project Preview
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: 800, mx: "auto", mb: 4 }}>
          CryptoBOM SaaS discovers, tracks and hardens every cryptographic asset across your stack — from classical
          RSA/AES inventories to post-quantum algorithm migration — in both Open Source and Enterprise editions.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Button
            variant="contained"
            startIcon={<GitHub />}
            href="https://github.com/rivic-q/cryptobom-saas"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
          >
            GitHub (OSS)
          </Button>
          <Button
            variant="contained"
            startIcon={<Rocket />}
            href="https://rivicq.xyz/enterprise"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
          >
            Enterprise Demo
          </Button>
        </Stack>
      </Box>

      {/* ── Edition Banners ── */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%", border: "2px solid #667eea40" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: "#667eea20", color: "#667eea" }}>
                  <GitHub />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Open Source Edition
                  </Typography>
                  <Chip label="Free · Apache 2.0" size="small" color="primary" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Full-featured CBOM engine for teams that need classical crypto discovery, K8s scanning and DevSecOps
                pipeline integration — completely free and self-hosted.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Port 8080 · Binary: <code>cryptobom-oss</code>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, #667eea10, #764ba220)",
              border: "2px solid #764ba240",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: "#764ba220", color: "#764ba2" }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Enterprise Edition
                  </Typography>
                  <Chip label="Contact Sales" size="small" color="secondary" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Everything in OSS plus IBM Quantum attestation, post-quantum migration planning, ML-powered threat
                detection and 24/7 German engineering support.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Port 9090 · Binary: <code>cryptobom-enterprise</code>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── OSS Features ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="🆓 Open Source Features"
          subtitle="Production-ready security tooling — no license fee, no vendor lock-in"
          accent="#667eea"
        />
        <Grid container spacing={2}>
          {OSS_FEATURES.map((f) => (
            <Grid item xs={12} sm={6} md={4} key={f.title}>
              <FeatureCard {...f} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Enterprise Features ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="🏢 Enterprise Features"
          subtitle="Quantum-safe security with real IBM Q hardware and 24/7 German engineering support"
          accent="#764ba2"
        />
        <Grid container spacing={2}>
          {ENTERPRISE_FEATURES.map((f) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <FeatureCard {...f} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Comparison Table ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="📊 Feature Comparison"
          subtitle="Side-by-side view of what each edition includes"
        />
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Feature</TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  OSS (Free)
                </TableCell>
                <TableCell align="center" sx={{ color: "white", fontWeight: "bold" }}>
                  Enterprise
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {COMPARISON_ROWS.map((row, i) => (
                <TableRow key={row.feature} sx={{ bgcolor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                  <TableCell>{row.feature}</TableCell>
                  <TableCell align="center">
                    {row.ossLabel ? (
                      <Chip label={row.ossLabel} size="small" variant="outlined" />
                    ) : row.oss ? (
                      <CheckCircle sx={{ color: "#10b981" }} fontSize="small" />
                    ) : (
                      <Cancel sx={{ color: "#ef4444" }} fontSize="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {row.entLabel ? (
                      <Chip label={row.entLabel} size="small" color="secondary" />
                    ) : row.enterprise ? (
                      <CheckCircle sx={{ color: "#10b981" }} fontSize="small" />
                    ) : (
                      <Cancel sx={{ color: "#ef4444" }} fontSize="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── Architecture Overview ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="🏗️ Architecture Overview"
          subtitle="Core Engine layers shared by both editions"
        />
        <Grid container spacing={2}>
          {[
            {
              title: "DevSecOps Integration Layer",
              color: "#667eea",
              items: ["GitHub Actions / GitLab CI / Jenkins", "eBPF Tracing & Syscall Hooking", "Prometheus + Grafana + Jaeger"],
            },
            {
              title: "Quantum Computing Layer",
              color: "#7c3aed",
              items: ["IBM Quantum (27+ qubits, 99.4% fidelity) — Enterprise", "KIPU Quantum Q-CTRL (< 1 000 qubits) — Enterprise", "Mock Provider (testing) — OSS"],
            },
            {
              title: "Classical Engine Layer",
              color: "#10b981",
              items: ["Kubernetes Cluster Scanning", "Container Image Analysis", "Compliance Rule Engine + CBOM Versioning"],
            },
            {
              title: "Multi-Language SDK Layer",
              color: "#f59e0b",
              items: ["Python (Qiskit), Java (Spring), Rust (zero-cost)", "C++ (HPC), C (system), Ruby (Rails) — Enterprise", "REST API available to all editions"],
            },
          ].map((layer) => (
            <Grid item xs={12} sm={6} key={layer.title}>
              <Card sx={{ height: "100%", borderLeft: `4px solid ${layer.color}` }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" color={layer.color} gutterBottom>
                    {layer.title}
                  </Typography>
                  <List dense disablePadding>
                    {layer.items.map((item) => (
                      <ListItem key={item} disableGutters sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckCircle sx={{ fontSize: 16, color: layer.color }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item}
                          primaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Compliance Scores ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="🛡️ Compliance Coverage"
          subtitle="Scores across major regulatory frameworks (Enterprise)"
        />
        <Card elevation={2}>
          <CardContent>
            <Grid container spacing={3}>
              {COMPLIANCE_SCORES.map(({ label, score }) => (
                <Grid item xs={12} sm={6} md={4} key={label}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>{label}</Typography>
                      <Chip
                        label={`${score}%`}
                        size="small"
                        color={score >= 90 ? "success" : score >= 75 ? "warning" : "error"}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={score}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={score >= 90 ? "success" : score >= 75 ? "warning" : "error"}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* ── Language SDKs (Enterprise) ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="⚡ Multi-Language SDK Performance"
          subtitle="Enterprise SDK benchmarks with quantum integration"
          accent="#764ba2"
        />
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "secondary.main" }}>
                {["Language", "API Response", "Memory", "Quantum Integration"].map((h) => (
                  <TableCell key={h} sx={{ color: "white", fontWeight: "bold" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {LANGUAGES.map((l, i) => (
                <TableRow key={l.lang} sx={{ bgcolor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                  <TableCell>
                    <Chip
                      label={l.lang}
                      size="small"
                      sx={{ bgcolor: l.badge, color: "white", fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell>{l.response}</TableCell>
                  <TableCell>{l.mem}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CheckCircle sx={{ color: "#10b981", fontSize: 16 }} />
                      <Typography variant="body2">{l.quantum}</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── Migration Path ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader
          title="🚀 OSS → Enterprise Migration Path"
          subtitle="Upgrade your deployment without losing any data"
        />
        <Grid container spacing={2}>
          {MIGRATION_STEPS.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.step}>
              <Card sx={{ height: "100%", border: "1px solid #667eea30" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "primary.main",
                        fontSize: 14,
                        fontWeight: "bold",
                      }}
                    >
                      {s.step}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {s.title}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {s.detail}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── FAQ Accordions ── */}
      <Box sx={{ mb: 5 }}>
        <SectionHeader title="❓ FAQ" subtitle="Common questions about editions and capabilities" />

        {[
          {
            panel: "panel1",
            q: "Can I self-host the Enterprise edition?",
            a: "Yes. The Enterprise binary ships as a Docker image and Helm chart, identical to OSS but with additional feature flags. You provide the IBM Quantum API key and other secrets via environment variables or Kubernetes secrets.",
          },
          {
            panel: "panel2",
            q: "What is CBOM and why does it matter?",
            a: "A Cryptographic Bill of Materials (CBOM) is an inventory of every cryptographic primitive used in your software supply chain — algorithms, key sizes, certificate chains and protocol versions. As post-quantum standards land (FIPS 203/204/205) you need to know exactly what to migrate.",
          },
          {
            panel: "panel3",
            q: "Does the OSS edition have any quantum capability?",
            a: "The OSS edition ships with a deterministic Mock provider so you can test quantum-readiness scoring locally. Real IBM Quantum Network access (27+ qubit hardware) and KIPU Quantum Q-CTRL integration are Enterprise-only features.",
          },
          {
            panel: "panel4",
            q: "How do I migrate from OSS to Enterprise?",
            a: "Follow the six-step migration path above. CryptoBOM provides a /api/v1/migration/import endpoint to import your OSS CBOM database into the Enterprise backend with zero data loss.",
          },
        ].map(({ panel, q, a }) => (
          <Accordion
            key={panel}
            expanded={accordionOpen === panel}
            onChange={handleAccordion(panel)}
            elevation={1}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography fontWeight={500}>{q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                {a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* ── CTA ── */}
      <Divider sx={{ mb: 4 }} />
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Ready to get started?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: "auto" }}>
          Start with the open-source edition today, or contact RivicQ GmbH for an Enterprise trial with real IBM Quantum
          attestation.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<GitHub />}
            endIcon={<OpenInNew />}
            href="https://github.com/rivic-q/cryptobom-saas"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ background: "linear-gradient(45deg, #667eea, #764ba2)" }}
          >
            Try OSS — it's free
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Business />}
            endIcon={<ArrowForward />}
            href="https://rivicq.xyz/enterprise"
            target="_blank"
            rel="noopener noreferrer"
            color="secondary"
          >
            Contact Enterprise Sales
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          RivicQ GmbH · LEAP BERLIN · Rudower Chaussee 29, 12489 Berlin, Germany ·{" "}
          <a href="mailto:hello@rivicq.xyz" style={{ color: "inherit" }}>
            hello@rivicq.xyz
          </a>
        </Typography>
      </Box>
    </Box>
  )
}

export default ProjectPreview
