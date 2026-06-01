import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  CheckCircle,
  ArrowForward,
  Close,
} from '@mui/icons-material';

export interface Endpoint {
  id: string;
  host: string;
  port: number;
  protocol: 'tls' | 'ssh' | 'http';
  label: string;
  status?: 'pending_scan' | 'scanning' | 'completed' | 'error';
}

export interface ScanConfig {
  protocols: Array<'tls' | 'ssh' | 'http'>;
  rate_limit: 'gentle' | 'standard' | 'aggressive';
  safe_mode: boolean;
  timeout_seconds: number;
}

interface EndpointDiscoveryWizardProps {
  open: boolean;
  onClose: () => void;
  onScanStart: (endpoints: Endpoint[], config: ScanConfig) => void;
  loading?: boolean;
}

const discoveryMethods = [
  { id: 'manual', label: 'Manual Entry', desc: 'Add hostnames and ports manually' },
  { id: 'kubernetes', label: 'Kubernetes Cluster', desc: 'Import from connected cluster' },
  { id: 'cloud', label: 'Cloud Inventory', desc: 'AWS, GCP, IBM Cloud (requires credentials)' },
  { id: 'cilium', label: 'Cilium Network', desc: 'From eBPF telemetry (if available)' },
];

const EndpointDiscoveryWizard: React.FC<EndpointDiscoveryWizardProps> = ({
  open,
  onClose,
  onScanStart,
  loading = false,
}) => {
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState('manual');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [config, setConfig] = useState<ScanConfig>({
    protocols: ['tls', 'ssh', 'http'],
    rate_limit: 'standard',
    safe_mode: true,
    timeout_seconds: 60,
  });

  // Manual entry form
  const [formHost, setFormHost] = useState('');
  const [formPort, setFormPort] = useState('443');
  const [formProtocol, setFormProtocol] = useState<'tls' | 'ssh' | 'http'>('tls');
  const [formLabel, setFormLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const steps = ['Select Discovery Method', 'Add Endpoints', 'Configure Scan', 'Review & Approve'];

  const addEndpoint = () => {
    if (!formHost.trim()) {
      alert('Please enter a hostname');
      return;
    }
    const portNum = parseInt(formPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      alert('Please enter a valid port (1-65535)');
      return;
    }

    if (editingId) {
      setEndpoints(endpoints.map(e =>
        e.id === editingId
          ? { ...e, host: formHost, port: portNum, protocol: formProtocol, label: formLabel }
          : e
      ));
      setEditingId(null);
    } else {
      setEndpoints([
        ...endpoints,
        {
          id: `ep-${Date.now()}`,
          host: formHost,
          port: portNum,
          protocol: formProtocol,
          label: formLabel || formHost,
          status: 'pending_scan',
        },
      ]);
    }

    setFormHost('');
    setFormPort('443');
    setFormProtocol('tls');
    setFormLabel('');
  };

  const deleteEndpoint = (id: string) => {
    setEndpoints(endpoints.filter(e => e.id !== id));
  };

  const editEndpoint = (endpoint: Endpoint) => {
    setFormHost(endpoint.host);
    setFormPort(endpoint.port.toString());
    setFormProtocol(endpoint.protocol);
    setFormLabel(endpoint.label);
    setEditingId(endpoint.id);
  };

  const handleNext = () => {
    if (step === 1 && endpoints.length === 0) {
      alert('Please add at least one endpoint');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleStart = () => {
    onScanStart(endpoints, config);
  };

  const protocolCounts = {
    tls: endpoints.filter(e => e.protocol === 'tls').length,
    ssh: endpoints.filter(e => e.protocol === 'ssh').length,
    http: endpoints.filter(e => e.protocol === 'http').length,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            CBOM Endpoint Discovery
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={onClose}
            disabled={loading}
            sx={{ minWidth: 0, p: 0 }}
          >
            <Close />
          </Button>
        </Box>

        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Select Discovery Method */}
        {step === 0 && (
          <Stack spacing={2}>
            <Alert severity="info">
              Choose how to populate your endpoint list. You can combine multiple methods.
            </Alert>
            {discoveryMethods.map((m) => (
              <Card
                key={m.id}
                onClick={() => setMethod(m.id)}
                sx={{
                  cursor: 'pointer',
                  border: method === m.id ? '2px solid' : '1px solid',
                  borderColor: method === m.id ? 'primary.main' : 'divider',
                  bgcolor: method === m.id ? 'primary.light' : 'background.paper',
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <FormControlLabel
                    control={<Radio checked={method === m.id} onChange={() => setMethod(m.id)} />}
                    label={
                      <Box>
                        <Typography fontWeight={600}>{m.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {m.desc}
                        </Typography>
                      </Box>
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {/* Step 1: Add Endpoints */}
        {step === 1 && (
          <Stack spacing={2}>
            {method === 'manual' && (
              <Card>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    Add Endpoint
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Hostname or IP"
                      placeholder="api.example.com"
                      fullWidth
                      value={formHost}
                      onChange={(e) => setFormHost(e.target.value)}
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          label="Port"
                          type="number"
                          fullWidth
                          value={formPort}
                          onChange={(e) => setFormPort(e.target.value)}
                          inputProps={{ min: 1, max: 65535 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Protocol</InputLabel>
                          <Select
                            value={formProtocol}
                            label="Protocol"
                            onChange={(e) => setFormProtocol(e.target.value as 'tls' | 'ssh' | 'http')}
                          >
                            <MenuItem value="tls">TLS</MenuItem>
                            <MenuItem value="ssh">SSH</MenuItem>
                            <MenuItem value="http">HTTP</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                    <TextField
                      label="Label (optional)"
                      placeholder="e.g., API Server"
                      fullWidth
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      startIcon={editingId ? <Edit /> : <Add />}
                      onClick={addEndpoint}
                    >
                      {editingId ? 'Update' : 'Add'} Endpoint
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Typography variant="subtitle2" fontWeight={600}>
              Endpoints ({endpoints.length})
            </Typography>

            {endpoints.length > 0 ? (
              <TableContainer component={Card}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell>Host</TableCell>
                      <TableCell align="center">Port</TableCell>
                      <TableCell align="center">Protocol</TableCell>
                      <TableCell>Label</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {endpoints.map((ep) => (
                      <TableRow key={ep.id}>
                        <TableCell>{ep.host}</TableCell>
                        <TableCell align="center">{ep.port}</TableCell>
                        <TableCell align="center">
                          <Chip label={ep.protocol.toUpperCase()} size="small" />
                        </TableCell>
                        <TableCell>{ep.label}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => editEndpoint(ep)}
                            sx={{ minWidth: 0 }}
                          >
                            <Edit fontSize="small" />
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={() => deleteEndpoint(ep.id)}
                            sx={{ minWidth: 0 }}
                          >
                            <Delete fontSize="small" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="warning">No endpoints added yet</Alert>
            )}
          </Stack>
        )}

        {/* Step 2: Configure Scan */}
        {step === 2 && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Protocols to Scan
                </Typography>
                <Stack>
                  {(['tls', 'ssh', 'http'] as const).map((proto) => (
                    <FormControlLabel
                      key={proto}
                      control={
                        <Checkbox
                          checked={config.protocols.includes(proto)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                protocols: [...config.protocols, proto],
                              });
                            } else {
                              setConfig({
                                ...config,
                                protocols: config.protocols.filter((p) => p !== proto),
                              });
                            }
                          }}
                        />
                      }
                      label={`${proto.toUpperCase()} (${protocolCounts[proto]} endpoints)`}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Scan Behavior
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      Rate Limit
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={config.rate_limit}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            rate_limit: e.target.value as any,
                          })
                        }
                      >
                        <MenuItem value="gentle">Gentle (safe for production)</MenuItem>
                        <MenuItem value="standard">Standard (recommended)</MenuItem>
                        <MenuItem value="aggressive">Aggressive (faster, riskier)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={config.safe_mode}
                        onChange={(e) =>
                          setConfig({ ...config, safe_mode: e.target.checked })
                        }
                      />
                    }
                    label="Safe Mode (read-only, no destructive probes)"
                  />

                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      Timeout per endpoint (seconds)
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={config.timeout_seconds}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            timeout_seconds: parseInt(e.target.value as string),
                          })
                        }
                      >
                        <MenuItem value={30}>30 seconds</MenuItem>
                        <MenuItem value={60}>60 seconds (default)</MenuItem>
                        <MenuItem value={120}>120 seconds</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Step 3: Review & Approve */}
        {step === 3 && (
          <Stack spacing={2}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                  Scan Summary
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Total Endpoints
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {endpoints.length}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      TLS Endpoints
                    </Typography>
                    <Typography variant="body2">{protocolCounts.tls}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      SSH Endpoints
                    </Typography>
                    <Typography variant="body2">{protocolCounts.ssh}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      HTTP Endpoints
                    </Typography>
                    <Typography variant="body2">{protocolCounts.http}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Rate Limit
                    </Typography>
                    <Typography variant="body2">{config.rate_limit}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Safe Mode
                    </Typography>
                    <Typography variant="body2">{config.safe_mode ? 'Enabled' : 'Disabled'}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Timeout per Endpoint
                    </Typography>
                    <Typography variant="body2">{config.timeout_seconds}s</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Alert severity="success">
              <CheckCircle sx={{ mr: 1, mb: -0.5, display: 'inline' }} />
              Ready to start scan. Click "Start Scan" to begin.
            </Alert>
          </Stack>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {step > 0 && (
              <Button
                variant="outlined"
                onClick={handlePrevious}
                disabled={loading}
              >
                Back
              </Button>
            )}

            {step < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={loading}
                endIcon={<ArrowForward />}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={handleStart}
                disabled={loading || endpoints.length === 0}
              >
                Start Scan
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default EndpointDiscoveryWizard;
