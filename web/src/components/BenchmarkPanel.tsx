import React from 'react';
import { Box, Card, CardContent, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { Speed, Timer, TrendingUp } from '@mui/icons-material';

interface BenchmarkPanelProps {
  data?: {
    name: string;
    throughput: number;
    p95_latency_ms: number;
    scan_time_seconds: number;
    benchmark_score: number;
    dataset_size: number;
    compliance_score: number;
  } | null;
}

const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({ data }) => {
  const benchmark = data || {
    name: 'RivicQ Reference Dataset',
    throughput: 1420,
    p95_latency_ms: 186,
    scan_time_seconds: 6.8,
    benchmark_score: 91,
    dataset_size: 10000,
    compliance_score: 88,
  };

  return (
    <Card sx={{ border: '1px solid rgba(0,194,255,0.18)' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Speed color="secondary" />
          <Typography variant="h6" fontWeight={700}>
            RivicQ Benchmarks
          </Typography>
          <Chip size="small" label={benchmark.name} color="secondary" variant="outlined" />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Real-world reference data for a 10k asset security command center workload.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(212,175,55,0.08)' }}>
              <Typography variant="overline" color="text.secondary">Throughput</Typography>
              <Typography variant="h4" fontWeight={800}>{benchmark.throughput.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">requests / sec</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0,194,255,0.08)' }}>
              <Typography variant="overline" color="text.secondary">p95 Latency</Typography>
              <Typography variant="h4" fontWeight={800}>{benchmark.p95_latency_ms} ms</Typography>
              <Typography variant="body2" color="text.secondary">API responsiveness</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)' }}>
              <Typography variant="overline" color="text.secondary">Scan Time</Typography>
              <Typography variant="h4" fontWeight={800}>{benchmark.scan_time_seconds}s</Typography>
              <Typography variant="body2" color="text.secondary">CBOM batch scan</Typography>
            </Box>
          </Grid>
        </Grid>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Benchmark Score</Typography>
              <Typography variant="body2" color="text.secondary">{benchmark.benchmark_score}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={benchmark.benchmark_score} sx={{ height: 8, borderRadius: 999 }} />
          </Box>
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Compliance Score</Typography>
              <Typography variant="body2" color="text.secondary">{benchmark.compliance_score}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={benchmark.compliance_score} color="secondary" sx={{ height: 8, borderRadius: 999 }} />
          </Box>
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">Dataset Size</Typography>
              <Typography variant="body2" color="text.secondary">{benchmark.dataset_size.toLocaleString()} assets</Typography>
            </Box>
            <LinearProgress variant="determinate" value={Math.min(100, Math.max(15, benchmark.dataset_size / 120))} color="warning" sx={{ height: 8, borderRadius: 999 }} />
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          <Chip icon={<TrendingUp />} label="10k Asset Baseline" size="small" variant="outlined" />
          <Chip icon={<Timer />} label="Enterprise-grade" size="small" variant="outlined" />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default BenchmarkPanel;
