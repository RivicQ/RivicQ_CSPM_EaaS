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
import { AutoAwesome, HelpOutline } from '@mui/icons-material';
import { Edition } from '../config/editions';
import { GlassCard } from './ui';
import designSystem from '../theme/designSystem';

interface AIAssistantPanelProps {
  edition: Edition;
  totalAssets: number;
  complianceScore: number;
  pqcReadiness: number;
  benchmark?: {
    throughput: number;
    p95_latency_ms: number;
    scan_time_seconds: number;
  } | null;
}

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

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  edition,
  totalAssets,
  complianceScore,
  pqcReadiness,
  benchmark,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [question, setQuestion] = React.useState('How do I move from OSS to Enterprise?');
  const [answer, setAnswer] = React.useState('');

  const generateAnswer = () => {
    const lines = [
      edition === 'community'
        ? 'You are in Community mode. Core CBOM scanning, auth, assets, and analytics are available.'
        : edition === 'professional'
          ? 'You are in Professional mode. Cloud posture, conformance packs, and the full security module suite are unlocked.'
          : 'You are in Enterprise mode. CISO, CSPM, multi-cloud, PQC, and HSM controls are unlocked.',
      `Current scale: ${totalAssets.toLocaleString()} assets`,
      `Compliance posture: ${complianceScore}%`,
      `PQC readiness: ${pqcReadiness}%`,
    ];

    if (benchmark) {
      lines.push(`Benchmark snapshot: ${benchmark.throughput} req/sec, ${benchmark.p95_latency_ms} ms p95, ${benchmark.scan_time_seconds}s scan time`);
    }

    if (/enterprise|unlock|upgrade/i.test(question)) {
      lines.push('To unlock Professional or Enterprise, switch the edition on the login/register screen and log in with a paid workspace account.');
    } else if (/benchmark|performance|speed/i.test(question)) {
      lines.push('Benchmark recommendation: keep p95 latency under 250 ms and scan latency under 10 s for the demo environment.');
    } else {
      lines.push('Use the dashboard action cards to move into compliance, scanner, or PQC routes.');
    }

    setAnswer(lines.join(' '));
  };

  return (
    <GlassCard hover={false} glow={designSystem.proBlue.accent}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <AutoAwesome color="primary" />
        <Typography variant="h6" fontWeight={700} color="text.primary">
          RivicQ AI Assistance
        </Typography>
        <Chip size="small" color={edition === 'enterprise' ? 'secondary' : 'primary'} label={edition.toUpperCase()} />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
        Ask in plain English. The assistant explains Community limits, paid unlocks, and benchmark guidance.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        label="Ask RivicQ AI"
        placeholder="Example: What do I get in Enterprise?"
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
        <Button size="small" variant="outlined" sx={promptButtonSx} onClick={() => setQuestion('How do I move from OSS to Enterprise?')}>
          OSS vs Enterprise
        </Button>
        <Button size="small" variant="outlined" sx={promptButtonSx} onClick={() => setQuestion('Show me benchmark guidance for RivicQ.')}>
          Benchmark Guidance
        </Button>
        <Button size="small" variant="outlined" sx={promptButtonSx} onClick={() => setQuestion('What is locked in Community?')}>
          Locked Features
        </Button>
      </Stack>

      <Button variant="contained" onClick={generateAnswer} startIcon={<HelpOutline />} sx={{ mb: 2 }}>
        Generate Guidance
      </Button>

      {answer && (
        <Box
          sx={{
            p: 2,
            borderRadius: `${designSystem.radius.md}px`,
            bgcolor: isDark ? 'rgba(90,82,104,0.12)' : 'rgba(90,82,104,0.06)',
            border: `1px solid ${isDark ? 'rgba(90,82,104,0.28)' : 'rgba(90,82,104,0.2)'}`,
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

export default AIAssistantPanel;
