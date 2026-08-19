import React from 'react';
import { Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import {
  AccountTree,
  Analytics,
  Assessment,
  Cloud,
  Code,
  GitHub,
  Security,
  Visibility,
  Science,
  OpenInNew,
} from '@mui/icons-material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import ContextualAIAssistant from '../components/ContextualAIAssistant';
import { useAuth } from '../context/AuthContext';
import { tokens } from '../theme/tokens';

const tools = [
  {
    name: 'GitHub Actions',
    category: 'CI/CD',
    description: 'Automate build, test, security scan, and deployment pipelines.',
    icon: <GitHub />,
    accent: '#d4af37',
    docs: 'https://docs.github.com/actions',
  },
  {
    name: 'Terraform',
    category: 'IaC',
    description: 'Provision cloud and Kubernetes infrastructure reproducibly.',
    icon: <AccountTree />,
    accent: '#8d859a',
    docs: 'https://www.terraform.io/docs',
  },
  {
    name: 'Kubernetes',
    category: 'Runtime',
    description: 'Deploy and manage containers with policies, autoscaling, and observability.',
    icon: <Cloud />,
    accent: '#24a148',
    docs: 'https://kubernetes.io/docs',
  },
  {
    name: 'Prometheus',
    category: 'Observability',
    description: 'Scrape metrics and alert on security and platform health.',
    icon: <Analytics />,
    accent: '#ff832b',
    docs: 'https://prometheus.io/docs/introduction/overview/',
  },
  {
    name: 'Grafana',
    category: 'Observability',
    description: 'Visualize compliance, runtime, and security dashboards.',
    icon: <Visibility />,
    accent: '#8b5cf6',
    docs: 'https://grafana.com/docs/',
  },
  {
    name: 'Trivy',
    category: 'Security',
    description: 'Scan containers, filesystems, and IaC for vulnerabilities.',
    icon: <Security />,
    accent: '#da1e28',
    docs: 'https://aquasecurity.github.io/trivy/',
  },
  {
    name: 'CodeQL',
    category: 'Security',
    description: 'Static analysis for code vulnerabilities and secure coding issues.',
    icon: <Code />,
    accent: '#8d859a',
    docs: 'https://codeql.github.com/docs/',
  },
  {
    name: 'Syft',
    category: 'Supply Chain',
    description: 'Generate SBOMs for apps, containers, and filesystem images.',
    icon: <Science />,
    accent: '#d4af37',
    docs: 'https://github.com/anchore/syft',
  },
  {
    name: 'DevSecOps Benchmarks',
    category: 'Metrics',
    description: 'Track throughput, p95 latency, and scan time against RivicQ baseline data.',
    icon: <Assessment />,
    accent: '#22c55e',
    docs: 'RivicQ seeded benchmark dataset',
  },
];

const rivicqPipeline = [
  { label: 'Developer', detail: 'Commit code and infrastructure changes.' },
  { label: 'Git Repository', detail: 'Source of truth for applications and IaC.' },
  { label: 'CI/CD', detail: 'GitHub Actions (or equivalent) runs the pipeline.' },
  { label: 'RivicQ Security Scan', detail: '`rivicq scan .` — secrets, SAST, SCA, SBOM, CBOM, IaC.' },
  { label: 'CSPM + SCA + CryptoBOM', detail: 'Normalized findings feed one intelligence layer.' },
  { label: 'Risk Analysis', detail: 'Explainable crypto risk and policy gate (BLOCK / WARN).' },
  { label: 'Remediation', detail: 'Fix the finding, attach evidence, re-scan.' },
  { label: 'Secure Deployment', detail: 'Ship only after the gate is green.' },
];

const pipelineSteps = [
  'GitHub Actions runs CI, security scans, and deploy steps.',
  'Terraform manages repeatable cloud and Kubernetes infrastructure.',
  'Kubernetes hosts the application, scanner, and observability stack.',
  'Prometheus + Grafana expose operational and security metrics.',
  'Trivy + CodeQL + Syft keep the supply chain and code base guarded.',
];

const DevSecOpsTools: React.FC = () => {
  const { edition } = useAuth();

  return (
    <PageFrame
      eyebrow="Toolchain"
      title="DevSecOps Tools"
      subtitle="A practical reference for the CI/CD, IaC, runtime, observability, security, and supply chain tools behind RivicQ."
      badge="Gold Cyber Stack"
    >
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {tools.map((tool, i) => (
          <Grid item xs={12} sm={6} md={4} key={tool.name}>
            <Box sx={{ height: '100%' }}>
              <GlassCard glow={tool.accent} delay={i}>
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ color: tool.accent, mb: 1.5, '& svg': { fontSize: 28 } }}>{tool.icon}</Box>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                  {tool.name}
                </Typography>
                <Chip
                  size="small"
                  label={tool.category}
                  sx={{ width: 'fit-content', mt: 1, mb: 1.5, fontWeight: 600, fontSize: '0.7rem' }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
                  {tool.description}
                </Typography>
                <Button
                  href={tool.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                  sx={{ alignSelf: 'flex-start', mt: 2 }}
                >
                  Open Docs
                </Button>
              </Box>
              </GlassCard>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2.5 }}>
      <GlassCard hover={false} delay={0}>
        <Typography variant="overline" color="primary" fontWeight={800}>
          How RivicQ fits the pipeline
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Guided DevSecOps flow
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This is a product explanation, not a live attach to your CI. The real CLI is <Box component="code" sx={{ fontFamily: tokens.typography.mono }}>rivicq scan .</Box>
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          divider={
            <Typography color="primary" sx={{ display: { xs: 'none', md: 'block' }, px: 0.5 }} aria-hidden>
              ↓
            </Typography>
          }
          sx={{ flexWrap: 'wrap', alignItems: { md: 'stretch' } }}
        >
          {rivicqPipeline.map((step, i) => (
            <Box
              key={step.label}
              sx={{
                flex: 1,
                minWidth: { xs: '100%', md: 110 },
                p: 1.25,
                borderRadius: `${tokens.borderRadius.md}px`,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="primary" fontWeight={800}>
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Typography variant="subtitle2" fontWeight={800}>{step.label}</Typography>
              <Typography variant="caption" color="text.secondary">{step.detail}</Typography>
            </Box>
          ))}
        </Stack>
      </GlassCard>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={7}>
          <GlassCard hover={false} delay={0}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              DevSecOps Pipeline Reference
            </Typography>
            <Stack spacing={1.25}>
              {pipelineSteps.map((item, i) => (
                <Box
                  key={item}
                  sx={{
                    p: 1.75,
                    borderRadius: `${tokens.borderRadius.md}px`,
                    bgcolor: 'action.hover',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: tokens.typography.mono,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'primary.main',
                      minWidth: 20,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <GlassCard hover={false} glow={tokens.colors.rivicq[500]} delay={1}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              OSS vs Enterprise Access
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ p: 2, borderRadius: `${tokens.borderRadius.md}px`, bgcolor: 'rgba(212,175,55,0.08)', border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Community / OSS</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Core dashboard, CBOM scanner, local demos, and dev tooling.
                </Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: `${tokens.borderRadius.md}px`, bgcolor: 'rgba(79,70,229,0.08)', border: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'primary.main' }}>Enterprise</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  CISO, CSPM, compliance, IBM Quantum, AWS/GCP integrations, and advanced reporting.
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Grid>
      </Grid>

      <ContextualAIAssistant
        contextKey="tools"
        edition={edition}
        title="DevSecOps AI Assistant"
        description="Ask about GitHub Actions, Terraform, Kubernetes, Prometheus, Grafana, Trivy, CodeQL, Syft, or benchmark guidance."
      />
    </PageFrame>
  );
};

export default DevSecOpsTools;
