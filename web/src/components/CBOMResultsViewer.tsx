import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Download,
  Share,
  AccessTime,
  Dns,
  Shield,
  Code,
} from '@mui/icons-material';

interface Finding {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  host: string;
  port: number;
  protocol: string;
  algorithm?: string;
  evidence: string;
  remediation: string;
  bsi_ref?: string;
  dora_ref?: string;
  eidas_ref?: string;
  quantum_safe: boolean;
}

interface CBOMSummary {
  total_endpoints: number;
  scanned_endpoints: number;
  findings: Finding[];
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  quantum_safe_count: number;
  non_quantum_safe_count: number;
  scan_started_at: string;
  scan_completed_at: string;
}

interface CBOMResultsViewerProps {
  cbom: CBOMSummary;
  loading?: boolean;
  onExport?: (format: string) => void;
  onShare?: () => void;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <Error sx={{ color: '#ef4444' }} />;
    case 'high':
      return <Warning sx={{ color: '#f97316' }} />;
    case 'medium':
      return <Warning sx={{ color: '#eab308' }} />;
    case 'low':
      return <Info sx={{ color: '#3b82f6' }} />;
    default:
      return <Info sx={{ color: '#6366f1' }} />;
  }
};

const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'info';
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`findings-tabpanel-${index}`}
      aria-labelledby={`findings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const CBOMResultsViewer: React.FC<CBOMResultsViewerProps> = ({
  cbom,
  loading = false,
  onExport,
  onShare,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const findingsBySeverity = {
    critical: cbom.findings.filter((f) => f.severity === 'critical'),
    high: cbom.findings.filter((f) => f.severity === 'high'),
    medium: cbom.findings.filter((f) => f.severity === 'medium'),
    low: cbom.findings.filter((f) => f.severity === 'low'),
    info: cbom.findings.filter((f) => f.severity === 'info'),
  };

  const findingsByProtocol = {
    tls: cbom.findings.filter((f) => f.protocol === 'tls'),
    ssh: cbom.findings.filter((f) => f.protocol === 'ssh'),
    http: cbom.findings.filter((f) => f.protocol === 'http'),
  };

  const findingsByAlgorithm = cbom.findings.reduce((acc: any, f) => {
    if (f.algorithm) {
      if (!acc[f.algorithm]) acc[f.algorithm] = [];
      acc[f.algorithm].push(f);
    }
    return acc;
  }, {} as Record<string, Finding[]>);

  const findingsByEndpoint = cbom.findings.reduce((acc: any, f) => {
    const key = `${f.host}:${f.port}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  const handleViewDetail = (finding: Finding) => {
    setSelectedFinding(finding);
    setOpenDetail(true);
  };

  const scanDuration = cbom.scan_completed_at && cbom.scan_started_at
    ? new Date(cbom.scan_completed_at).getTime() - new Date(cbom.scan_started_at).getTime()
    : 0;
  const scanDurationSeconds = Math.round(scanDuration / 1000);

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Dns sx={{ color: 'primary.main' }} />
                <Typography variant="overline" color="text.secondary">
                  Endpoints Scanned
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {cbom.scanned_endpoints}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {cbom.total_endpoints} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Shield sx={{ color: 'warning.main' }} />
                <Typography variant="overline" color="text.secondary">
                  Total Findings
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {cbom.total_findings}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                {cbom.critical > 0 && (
                  <Chip label={`${cbom.critical} Critical`} size="small" color="error" />
                )}
                {cbom.high > 0 && (
                  <Chip label={`${cbom.high} High`} size="small" color="warning" />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle sx={{ color: 'success.main' }} />
                <Typography variant="overline" color="text.secondary">
                  Quantum Safety
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {cbom.quantum_safe_count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                out of {cbom.total_endpoints}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTime sx={{ color: 'info.main' }} />
                <Typography variant="overline" color="text.secondary">
                  Scan Duration
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {scanDurationSeconds}s
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Findings Tabs */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Findings ({cbom.total_findings})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<Download />}
                onClick={() => onExport?.('json')}
              >
                Export
              </Button>
              <Button
                size="small"
                startIcon={<Share />}
                onClick={onShare}
              >
                Share
              </Button>
            </Box>
          </Box>

          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            aria-label="findings tabs"
          >
            <Tab label={`By Severity (${cbom.total_findings})`} />
            <Tab label={`By Protocol (${Object.keys(findingsByProtocol).length})`} />
            <Tab label={`By Algorithm (${Object.keys(findingsByAlgorithm).length})`} />
            <Tab label={`By Endpoint (${Object.keys(findingsByEndpoint).length})`} />
          </Tabs>

          {/* Tab 0: By Severity */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={2}>
              {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => {
                const findings = findingsBySeverity[severity];
                if (findings.length === 0) return null;

                return (
                  <Box key={severity}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, textTransform: 'capitalize' }}>
                      {severity} ({findings.length})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {findings.map((finding) => (
                            <TableRow
                              key={finding.id}
                              onClick={() => handleViewDetail(finding)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                              <TableCell align="center" sx={{ width: 40 }}>
                                {getSeverityIcon(finding.severity)}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {finding.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {finding.host}:{finding.port}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={finding.protocol.toUpperCase()}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                {finding.quantum_safe ? (
                                  <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                                ) : (
                                  <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              })}
            </Stack>
          </TabPanel>

          {/* Tab 1: By Protocol */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={2}>
              {(Object.entries(findingsByProtocol) as [string, Finding[]][]).map(([protocol, findings]) => {
                if (findings.length === 0) return null;

                return (
                  <Box key={protocol}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, textTransform: 'uppercase' }}>
                      {protocol} ({findings.length})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {findings.map((finding) => (
                            <TableRow
                              key={finding.id}
                              onClick={() => handleViewDetail(finding)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            >
                              <TableCell align="center" sx={{ width: 40 }}>
                                {getSeverityIcon(finding.severity)}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {finding.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {finding.host}:{finding.port}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={finding.severity.toUpperCase()}
                                  size="small"
                                  color={getSeverityColor(finding.severity)}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              })}
            </Stack>
          </TabPanel>

          {/* Tab 2: By Algorithm */}
          <TabPanel value={tabValue} index={2}>
            <Stack spacing={2}>
              {(Object.entries(findingsByAlgorithm) as [string, Finding[]][]).map(([algorithm, findings]) => (
                <Box key={algorithm}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    {algorithm} ({findings.length})
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {findings.map((finding) => (
                          <TableRow
                            key={finding.id}
                            onClick={() => handleViewDetail(finding)}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell align="center" sx={{ width: 40 }}>
                              {getSeverityIcon(finding.severity)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {finding.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {finding.host}:{finding.port}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Stack>
          </TabPanel>

          {/* Tab 3: By Endpoint */}
          <TabPanel value={tabValue} index={3}>
            <Stack spacing={2}>
              {(Object.entries(findingsByEndpoint) as [string, Finding[]][]).map(([endpoint, findings]) => (
                <Box key={endpoint}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    {endpoint} ({findings.length})
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {findings.map((finding) => (
                          <TableRow
                            key={finding.id}
                            onClick={() => handleViewDetail(finding)}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell align="center" sx={{ width: 40 }}>
                              {getSeverityIcon(finding.severity)}
                            </TableCell>
                            <TableCell sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {finding.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {finding.protocol.toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={finding.severity.toUpperCase()}
                                size="small"
                                color={getSeverityColor(finding.severity)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Stack>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Finding Detail Modal */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
        {selectedFinding && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getSeverityIcon(selectedFinding.severity)}
              {selectedFinding.title}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 2 }}>
                <Alert severity={getSeverityColor(selectedFinding.severity)}>
                  {selectedFinding.description}
                </Alert>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Endpoint
                  </Typography>
                  <Typography variant="body2">
                    <code>
                      {selectedFinding.host}:{selectedFinding.port}/{selectedFinding.protocol}
                    </code>
                  </Typography>
                </Box>

                {selectedFinding.algorithm && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Algorithm
                    </Typography>
                    <Typography variant="body2">{selectedFinding.algorithm}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Evidence
                  </Typography>
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{
                      bgcolor: 'background.default',
                      p: 1.5,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                    }}
                  >
                    {selectedFinding.evidence}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Remediation
                  </Typography>
                  <Typography variant="body2">{selectedFinding.remediation}</Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Compliance References
                  </Typography>
                  <Stack spacing={0.5}>
                    {selectedFinding.bsi_ref && (
                      <Typography variant="body2">
                        <strong>BSI:</strong> {selectedFinding.bsi_ref}
                      </Typography>
                    )}
                    {selectedFinding.dora_ref && (
                      <Typography variant="body2">
                        <strong>DORA:</strong> {selectedFinding.dora_ref}
                      </Typography>
                    )}
                    {selectedFinding.eidas_ref && (
                      <Typography variant="body2">
                        <strong>eIDAS:</strong> {selectedFinding.eidas_ref}
                      </Typography>
                    )}
                  </Stack>
                </Box>

                <Box>
                  <Chip
                    icon={selectedFinding.quantum_safe ? <CheckCircle /> : <Warning />}
                    label={selectedFinding.quantum_safe ? 'Quantum Safe' : 'Quantum Vulnerable'}
                    color={selectedFinding.quantum_safe ? 'success' : 'warning'}
                  />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetail(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default CBOMResultsViewer;
