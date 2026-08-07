import React from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import { AutoAwesome, HelpOutline } from '@mui/icons-material';
import { Edition } from '../config/editions';

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

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ edition, totalAssets, complianceScore, pqcReadiness, benchmark }) => {
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
    <Card sx={{ border: '1px solid rgba(15,98,254,0.30)', background: 'linear-gradient(135deg, rgba(16,26,45,0.95), rgba(8,17,31,0.95))' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6" fontWeight={700}>
            RivicQ AI Assistance
          </Typography>
          <Chip size="small" color={edition === 'enterprise' ? 'secondary' : 'primary'} label={edition.toUpperCase()} />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          sx={{ mb: 2 }}
        />

        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <Button size="small" variant="outlined" onClick={() => setQuestion('How do I move from OSS to Enterprise?')}>
            OSS vs Enterprise
          </Button>
          <Button size="small" variant="outlined" onClick={() => setQuestion('Show me benchmark guidance for RivicQ.')}>
            Benchmark Guidance
          </Button>
          <Button size="small" variant="outlined" onClick={() => setQuestion('What is locked in Community?')}>
            Locked Features
          </Button>
        </Stack>

        <Button variant="contained" onClick={generateAnswer} startIcon={<HelpOutline />} sx={{ mb: 2 }}>
          Generate Guidance
        </Button>

        {answer && (
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              AI Response
            </Typography>
            <Typography variant="body2">{answer}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAssistantPanel;
