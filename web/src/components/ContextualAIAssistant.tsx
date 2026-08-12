import React from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { AutoAwesome, SmartToy } from '@mui/icons-material';
import { Edition, isPaidEdition } from '../config/editions';
import { aiService } from '../services/api';
import { GlassCard } from './ui';
import designSystem from '../theme/designSystem';

type AssistantContext = 'dashboard' | 'tools' | 'auth' | 'enterprise' | 'scanner';

const BACKEND_CONTEXT: Record<AssistantContext, string> = {
  dashboard: 'dashboard',
  tools: 'dashboard',
  auth: 'dashboard',
  enterprise: 'posture',
  scanner: 'scan',
};

type AssistantProps = {
  contextKey: AssistantContext;
  edition: Edition;
  title?: string;
  description?: string;
  benchmark?: {
    throughput: number;
    p95_latency_ms: number;
    scan_time_seconds: number;
  } | null;
};

const CONTEXT_PROMPTS: Record<AssistantContext, string[]> = {
  dashboard: [
    'Explain the CISO, CSPM, CBOM, and PQC cards in plain language.',
    'What should I do first if I see high risk findings?',
    'How do I interpret the benchmark numbers on RivicQ?',
  ],
  tools: [
    'Which DevSecOps tools are used for CI/CD and supply chain security?',
    'How do GitHub Actions, Trivy, CodeQL, and Syft work together?',
    'What tools are locked to Enterprise in this workspace?',
  ],
  auth: [
    'How do I switch between Community and Enterprise?',
    'What features are limited in Community?',
    'What demo credentials should I use?',
  ],
  enterprise: [
    'Explain the enterprise-only controls and why they matter.',
    'How do I read the compliance and cloud posture metrics?',
    'What is required to unlock IBM Quantum and HSM data?',
  ],
  scanner: [
    'How do I run a CBOM scan and what outputs should I expect?',
    'What does the benchmark data mean for scan performance?',
    'How do I reduce scan time and improve coverage?',
  ],
};

const ASSISTANT_RESPONSES: Record<AssistantContext, (edition: Edition, benchmark?: AssistantProps['benchmark']) => string> = {
  dashboard: (edition, benchmark) => {
    const base = isPaidEdition(edition)
      ? 'Your paid edition unlocks executive compliance, cloud posture, and PQC migration analytics.'
      : 'Community keeps core CBOM, auth, scanning, and public dashboards available while locking paid module views.';
    return benchmark
      ? `${base} Benchmark snapshot: ${benchmark.throughput} req/sec, p95 ${benchmark.p95_latency_ms} ms, scan time ${benchmark.scan_time_seconds}s.`
      : base;
  },
  tools: (edition, benchmark) => {
    const base = isPaidEdition(edition)
      ? 'Use GitHub Actions for CI, Terraform for infra, Kubernetes for runtime, and Prometheus/Grafana for observability. Trivy, CodeQL, and Syft provide supply-chain and security coverage.'
      : 'Community can use the core DevSecOps toolchain view, but some paid automation cards remain locked.';
    return benchmark ? `${base} Current benchmark: ${benchmark.throughput} req/sec and ${benchmark.p95_latency_ms} ms p95.` : base;
  },
  auth: (edition) => isPaidEdition(edition)
    ? 'Paid access unlocks compliance, multi-cloud, quantum, and advanced reporting.'
    : 'Community access includes CBOM scanning and local demos, while paid routes stay locked.',
  enterprise: (edition) => isPaidEdition(edition)
    ? 'Your edition enables CISO, CSPM, PQC, multi-cloud HSM, and compliance workflows.'
    : 'The module surface is locked in Community and will redirect you to the dashboard.',
  scanner: (edition, benchmark) => {
    const base = isPaidEdition(edition)
      ? 'The scanner can be extended with compliance checks and cloud integrations.'
      : 'Community scanning focuses on CBOM generation, asset discovery, and local demo workflows.';
    return benchmark ? `${base} Demo benchmark scan time is ${benchmark.scan_time_seconds}s for a 10k asset reference set.` : base;
  },
};

const promptButtonSx = {
  textTransform: 'none' as const,
  fontWeight: 500,
  borderColor: 'divider',
  color: 'text.primary',
  bgcolor: 'action.hover',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'action.selected',
  },
};

const ContextualAIAssistant: React.FC<AssistantProps> = ({ contextKey, edition, title, description, benchmark }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [question, setQuestion] = React.useState(CONTEXT_PROMPTS[contextKey][0]);
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setQuestion(CONTEXT_PROMPTS[contextKey][0]);
  }, [contextKey]);

  const generateAnswer = async () => {
    setLoading(true);
    try {
      const response = await aiService.analyze({
        context: BACKEND_CONTEXT[contextKey],
        query: question,
      });
      const body = response?.data;
      setAnswer(
        body?.summary ||
        body?.analysis ||
        body?.response ||
        body?.suggestion ||
        body?.message ||
        'Analysis complete.'
      );
    } catch {
      const hints = CONTEXT_PROMPTS[contextKey];
      const selectedHint = hints.find((hint) => question.toLowerCase().includes(hint.toLowerCase().split(' ').slice(0, 3).join(' '))) || hints[0];
      const response = ASSISTANT_RESPONSES[contextKey](edition, benchmark);
      setAnswer(`${response} Suggested next action: ${selectedHint}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard hover={false} glow={designSystem.proBlue.accent}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <AutoAwesome color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">
          {title || 'RivicQ AI Assistant'}
        </Typography>
        <Chip size="small" color={edition === 'enterprise' ? 'secondary' : 'primary'} label={contextKey.toUpperCase()} />
      </Stack>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
          {description}
        </Typography>
      )}

      <TextField
        fullWidth
        multiline
        minRows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        label="Ask RivicQ AI"
        placeholder="Ask about tools, posture, compliance, or scans…"
        sx={{
          mb: 2,
          '& .MuiInputLabel-root': { color: 'text.secondary' },
          '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
          '& .MuiOutlinedInput-root': {
            color: 'text.primary',
            bgcolor: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.85)',
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: 'primary.main' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main' },
          },
        }}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {CONTEXT_PROMPTS[contextKey].slice(0, 3).map((prompt) => (
          <Button
            key={prompt}
            size="small"
            variant="outlined"
            onClick={() => setQuestion(prompt)}
            sx={promptButtonSx}
          >
            {prompt.split('?')[0]}
          </Button>
        ))}
      </Stack>

      <Button variant="contained" onClick={generateAnswer} startIcon={<SmartToy />} sx={{ mb: 2 }} disabled={loading}>
        {loading ? 'Analyzing…' : 'Generate Guidance'}
      </Button>

      {answer && (
        <Box
          sx={{
            p: 2,
            borderRadius: `${designSystem.radius.md}px`,
            bgcolor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)',
            border: `1px solid ${isDark ? 'rgba(96,165,250,0.28)' : 'rgba(59,130,246,0.2)'}`,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.primary', fontWeight: 700 }}>
            AI Response
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {answer}
          </Typography>
        </Box>
      )}
    </GlassCard>
  );
};

export default ContextualAIAssistant;
