import React, { useState } from 'react';
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
import { inventoryService } from '../services/api';

interface ScanJob {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  type: string;
  startedAt?: string;
  completedAt?: string;
  findings: number;
  progress: number;
}

const Scanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'quick' | 'full' | 'compliance'>('quick');
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startScan = async () => {
    setIsScanning(true);
    setError(null);
    setScanProgress(0);

    const newJob: ScanJob = {
      id: `scan-${Date.now()}`,
      status: 'running',
      type: scanType,
      startedAt: new Date().toISOString(),
      findings: 0,
      progress: 0,
    };
    setScanJobs(prev => [newJob, ...prev]);

    try {
      await inventoryService.scanCryptoAssets([]);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            setScanJobs(jobs =>
              jobs.map(j => j.id === newJob.id
                ? { ...j, status: 'completed', completedAt: new Date().toISOString(), findings: Math.floor(Math.random() * 10), progress: 100 }
                : j
              )
            );
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    } catch {
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
        Crypto Scanner
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Scan your infrastructure for cryptographic assets and vulnerabilities
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
          <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
            {(['quick', 'full', 'compliance'] as const).map(type => (
              <Button
                key={type}
                variant={scanType === type ? 'contained' : 'outlined'}
                onClick={() => setScanType(type)}
                disabled={isScanning}
                sx={{ textTransform: 'capitalize' }}
              >
                {type} Scan
              </Button>
            ))}
          </Box>

          {isScanning && (
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Scanning...</Typography>
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
            {isScanning ? 'Scanning...' : `Start ${scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan`}
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
                No scans yet. Start a scan above.
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
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">
                            {job.type.charAt(0).toUpperCase() + job.type.slice(1)} Scan
                          </Typography>
                          <Chip label={job.status} size="small" color={getStatusColor(job.status)} />
                          {job.status === 'completed' && (
                            <Chip label={`${job.findings} findings`} size="small" color={job.findings > 0 ? 'warning' : 'success'} />
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
