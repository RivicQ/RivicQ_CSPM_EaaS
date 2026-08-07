import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
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
} from '@mui/icons-material';
import ContextualAIAssistant from '../components/ContextualAIAssistant';
import { useAuth } from '../context/AuthContext';

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
    accent: '#4589ff',
    docs: 'https://www.terraform.io/docs',
  },
  {
    name: 'Kubernetes',
    category: 'Runtime',
    description: 'Deploy and manage containers with policies, autoscaling, and observability.',
    icon: <Cloud />,
    accent: '#10b981',
    docs: 'https://kubernetes.io/docs',
  },
  {
    name: 'Prometheus',
    category: 'Observability',
    description: 'Scrape metrics and alert on security and platform health.',
    icon: <Analytics />,
    accent: '#f59e0b',
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
    accent: '#ef4444',
    docs: 'https://aquasecurity.github.io/trivy/',
  },
  {
    name: 'CodeQL',
    category: 'Security',
    description: 'Static analysis for code vulnerabilities and secure coding issues.',
    icon: <Code />,
    accent: '#4589ff',
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

const DevSecOpsTools: React.FC = () => {
  const { edition } = useAuth();

  return (
    <Box>
      <Stack spacing={1.25} sx={{ mb: 3 }}>
        <Chip label="DevSecOps Tools" color="primary" sx={{ width: 'fit-content' }} />
        <Typography variant="h4" fontWeight={900}>
          Gold Cyber Toolchain for OSS and Enterprise
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 960 }}>
          A practical reference surface for the tools behind the RivicQ platform: CI/CD, IaC, runtime orchestration, observability, security, and software supply chain controls.
        </Typography>
      </Stack>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {tools.map((tool) => (
          <Grid item xs={12} sm={6} md={4} key={tool.name}>
            <Card sx={{ height: '100%', border: '1px solid rgba(212,175,55,0.16)' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ color: tool.accent, mb: 1.5 }}>{tool.icon}</Box>
                <Typography variant="h6" fontWeight={800}>{tool.name}</Typography>
                <Chip size="small" label={tool.category} sx={{ width: 'fit-content', mt: 1, mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {tool.description}
                </Typography>
                <Button href={tool.docs} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  Open Docs
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                DevSecOps Pipeline Reference
              </Typography>
              <Stack spacing={1.5}>
                {[
                  'GitHub Actions runs CI, security scans, and deploy steps.',
                  'Terraform manages repeatable cloud and Kubernetes infrastructure.',
                  'Kubernetes hosts the application, scanner, and observability stack.',
                  'Prometheus + Grafana expose operational and security metrics.',
                  'Trivy + CodeQL + Syft keep the supply chain and code base guarded.',
                ].map((item) => (
                  <Box key={item} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <Typography variant="body2">{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                OSS vs Enterprise Tool Access
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(212,175,55,0.08)' }}>
                  <Typography variant="subtitle2">OSS</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Core dashboard, CBOM scanner, local demos, and dev tooling.
                  </Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(15,98,254,0.10)' }}>
                  <Typography variant="subtitle2">Enterprise</Typography>
                  <Typography variant="body2" color="text.secondary">
                    CISO, CSPM, compliance, IBM Quantum, AWS/GCP integrations, and advanced reporting.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ContextualAIAssistant
        contextKey="tools"
        edition={edition}
        title="DevSecOps AI Assistant"
        description="Ask about GitHub Actions, Terraform, Kubernetes, Prometheus, Grafana, Trivy, CodeQL, Syft, or benchmark guidance."
      />
    </Box>
  );
};

export default DevSecOpsTools;
