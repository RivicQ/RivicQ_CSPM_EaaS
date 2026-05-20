import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Security,
  Refresh,
} from '@mui/icons-material';
import { cbomService } from '../services/api';

interface ScanJob {
  id: string;
  scanId?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  type: string;
  target: string;
  startedAt?: string;
  completedAt?: string;
  findings: number;
  progress: number;
  resultUrl?: string;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40;

const Scanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'quick' | 'full' | 'compliance' | 'cbom'>('cbom');
  const [scanTarget, setScanTarget] = useState('');
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pollAttemptsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const clearPolling = () => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const updateJob = (jobId: string, updater: (job: ScanJob) => ScanJob) => {
    setScanJobs(prev => prev.map(job => (job.id === jobId ? updater(job) : job)));
  };

  const normalizeFindings = (findings: any) => {
    if (!findings || typeof findings !== 'object') {
      return 0;
    }

    return findings.total
      ?? findings.total_findings
      ?? findings.count
      ?? findings.totalCount
      ?? 0;
  };

  const pollScanStatus = (jobId: string, scanId: string) => {
    clearPolling();
    pollAttemptsRef.current = 0;

    pollTimerRef.current = window.setInterval(async () => {
      pollAttemptsRef.current += 1;

      try {
        const response = await cbomService.getScanStatus(scanId);
        const data = response.data ?? response;
        const status = data.status ?? 'running';
        const progress = typeof data.progress === 'number'
          ? data.progress
          : status === 'completed'
            ? 100
            : Math.min(pollAttemptsRef.current * 10, 95);

        setScanProgress(progress);
        updateJob(jobId, job => ({
          ...job,
          status: status === 'failed' ? 'failed' : status === 'completed' ? 'completed' : 'running',
          progress,
          findings: normalizeFindings(data.findings),
          completedAt: status === 'completed' ? new Date().toISOString() : job.completedAt,
          resultUrl: data.result_url ?? data.resultUrl ?? job.resultUrl,
        }));

        if (status === 'completed' || status === 'failed') {
          clearPolling();
          setIsScanning(false);
        }
      } catch (pollError) {
        console.error('Polling scan status failed:', pollError);

        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          clearPolling();
          setIsScanning(false);
          updateJob(jobId, job => ({ ...job, status: 'failed' }));
          setError('Scan status polling timed out. Check the backend and try again.');
        }
      }
    }, POLL_INTERVAL_MS);
  };

  const startScan = async () => {
    const target = scanTarget.trim();

    if (!target) {
      setError('Please specify a scan target (e.g. hostname, repo path, or container image).');
      return;
    }

    clearPolling();
    setIsScanning(true);
    setError(null);
    setScanProgress(0);

    const newJob: ScanJob = {
      id: `scan-${Date.now()}`,
      status: 'running',
      type: scanType,
      target,
      startedAt: new Date().toISOString(),
      findings: 0,
      progress: 0,
    };
    setScanJobs(prev => [newJob, ...prev]);

    try {
      const response = await cbomService.triggerScan(target, scanType);
      const data = response.data ?? response;
      const scanId = data.scan_id ?? data.scanId ?? newJob.id;

      updateJob(newJob.id, job => ({
        ...job,
        scanId,
        status: 'running',
      }));

      pollScanStatus(newJob.id, scanId);
    } catch (err) {
      console.error('Scan failed:', err);
      clearPolling();
      setError('Scan failed. Make sure the backend is running.');
      setIsScanning(false);
      setScanJobs(jobs =>
        jobs.map(j => j.id === newJob.id ? { ...j, status: 'failed' } : j)
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <Schedule color="disabled" />;
      case 'running': return <Refresh />;
      case 'completed': return <CheckCircle color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      default: return <Schedule />;
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'running': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        CBOM Scanner
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate a Cryptographic Bill of Materials (CBOM) for any asset — repo, container image, or hostname.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Scan Configuration
          </Typography>

          <TextField
            fullWidth
            label="Scan Target"
            placeholder="e.g. myrepo/, ghcr.io/org/image:tag, api.example.com"
            value={scanTarget}
            onChange={e => setScanTarget(e.target.value)}
            disabled={isScanning}
            sx={{ mb: 2 }}
            helperText="Enter a repository path, container image reference, or hostname to scan."
          />

          <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
            {(['cbom', 'quick', 'full', 'compliance'] as const).map(type => (
              <Button
                key={type}
                variant={scanType === type ? 'contained' : 'outlined'}
                onClick={() => setScanType(type)}
                disabled={isScanning}
                sx={{ textTransform: 'capitalize' }}
                color={type === 'cbom' ? 'primary' : 'inherit'}
              >
                {type === 'cbom' ? 'CBOM Scan' : `${type.charAt(0).toUpperCase() + type.slice(1)} Scan`}
              </Button>
            ))}
          </Box>

          {isScanning && (
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Scanning {scanTarget}…</Typography>
                <Typography variant="body2">{scanProgress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={scanProgress} />
            </Box>
          )}

          <Button
            variant="contained"
            startIcon={isScanning ? <Stop /> : <PlayArrow />}
            onClick={startScan}
            disabled={isScanning}
            size="large"
            sx={{ background: isScanning ? undefined : 'linear-gradient(45deg, #667eea, #764ba2)' }}
          >
            {isScanning ? 'Scanning…' : `Start ${scanType === 'cbom' ? 'CBOM' : scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Scan History
          </Typography>
          {scanJobs.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Security sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                No scans yet. Enter a target above and start a CBOM scan.
              </Typography>
            </Box>
          ) : (
            <List>
              {scanJobs.map((job, index) => (
                <React.Fragment key={job.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(job.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography variant="body1">
                            {job.type === 'cbom' ? 'CBOM' : job.type.charAt(0).toUpperCase() + job.type.slice(1)} Scan
                          </Typography>
                          <Chip label={job.target} size="small" variant="outlined" />
                          {job.scanId && <Chip label={job.scanId.slice(0, 8)} size="small" variant="outlined" />}
                          <Chip label={job.status} size="small" color={getStatusColor(job.status)} />
                          {job.status === 'completed' && (
                            <Chip label={`${job.findings} findings`} size="small" color={job.findings > 0 ? 'warning' : 'success'} />
                          )}
                          {job.resultUrl && (
                            <Chip label="Report ready" size="small" color="primary" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={job.startedAt ? `Started: ${new Date(job.startedAt).toLocaleString()}` : ''}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Scanner;
