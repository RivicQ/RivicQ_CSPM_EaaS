import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Download,
  Gavel,
  Shield,
  TrendingUp,
  Assignment,
  Timeline,
  CheckBox,
  OpenInNew,
} from '@mui/icons-material';

interface ComplianceStatus {
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  score: number; // 0-100
}

interface ComplianceRequirement {
  id: string;
  title: string;
  section: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  findings_count: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  remediation: string;
}

interface ComplianceFramework {
  name: string;
  short_name: string;
  description: string;
  compliance_status: ComplianceStatus;
  requirements: ComplianceRequirement[];
  deadline?: string;
  resources?: string[];
}

interface ComplianceViewerProps {
  scan_id: string;
  frameworks: ComplianceFramework[];
  summary?: {
    total_findings: number;
    critical_findings: number;
    missing_mitigations: number;
  };
}

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
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'compliant':
      return 'success';
    case 'non_compliant':
      return 'error';
    case 'partial':
      return 'warning';
    default:
      return 'info';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'compliant':
      return <CheckCircle sx={{ color: 'success.main' }} />;
    case 'non_compliant':
      return <Error sx={{ color: 'error.main' }} />;
    case 'partial':
      return <Warning sx={{ color: 'warning.main' }} />;
    default:
      return null;
  }
};

const ComplianceFrameworkViewer: React.FC<ComplianceViewerProps> = ({
  scan_id,
  frameworks,
  summary,
}) => {
  const [tabValue, setTabValue] = useState(0);

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Compliance Framework Assessment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Scan {scan_id} • {summary?.total_findings || 0} findings across {frameworks.length} frameworks
        </Typography>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Assignment sx={{ color: 'primary.main' }} />
                  <Typography variant="overline" color="text.secondary">
                    Total Findings
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {summary.total_findings}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Error sx={{ color: 'error.main' }} />
                  <Typography variant="overline" color="text.secondary">
                    Critical Findings
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {summary.critical_findings}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Timeline sx={{ color: 'warning.main' }} />
                  <Typography variant="overline" color="text.secondary">
                    Missing Mitigations
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  {summary.missing_mitigations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Framework Overview Cards */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        Framework Compliance Scores
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {frameworks.map((framework) => (
          <Grid item xs={12} sm={6} md={3} key={framework.short_name}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {framework.short_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {framework.name}
                    </Typography>
                  </Box>
                  {getStatusIcon(framework.compliance_status.status)}
                </Box>

                <Box sx={{ my: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {framework.compliance_status.score}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={framework.compliance_status.score}
                    color={getProgressBarColor(framework.compliance_status.score) as any}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                    }}
                  />
                </Box>

                <Chip
                  label={framework.compliance_status.status.replace(/_/g, ' ').toUpperCase()}
                  size="small"
                  color={getStatusColor(framework.compliance_status.status)}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Framework Details Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="compliance frameworks"
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {frameworks.map((framework, idx) => (
            <Tab key={framework.short_name} label={framework.short_name} id={`compliance-tab-${idx}`} />
          ))}
        </Tabs>

        {frameworks.map((framework, idx) => (
          <TabPanel key={framework.short_name} value={tabValue} index={idx}>
            <CardContent>
              <Stack spacing={3}>
                {/* Framework Description */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Overview
                  </Typography>
                  <Typography variant="body2">{framework.description}</Typography>
                  {framework.deadline && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <strong>Compliance Deadline:</strong> {framework.deadline}
                    </Alert>
                  )}
                </Box>

                {/* Compliance Score Detail */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    Compliance Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={framework.compliance_status.score}
                        color={getProgressBarColor(framework.compliance_status.score) as any}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                        }}
                      />
                    </Box>
                    <Typography variant="body1" fontWeight={700}>
                      {framework.compliance_status.score}%
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={framework.compliance_status.status.replace(/_/g, ' ')}
                      color={getStatusColor(framework.compliance_status.status)}
                      size="small"
                    />
                    <Chip
                      label={`${framework.requirements.filter((r) => r.status === 'compliant').length} compliant`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`${framework.requirements.filter((r) => r.status === 'non_compliant').length} non-compliant`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                {/* Requirements Table */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Requirements ({framework.requirements.length})
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'background.default' }}>
                          <TableCell>Requirement</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="center">Findings</TableCell>
                          <TableCell align="center">Impact</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {framework.requirements.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {req.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {req.section}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                {getStatusIcon(req.status)}
                                <Typography variant="caption">
                                  {req.status.replace(/_/g, ' ').charAt(0).toUpperCase() +
                                    req.status.replace(/_/g, ' ').slice(1)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={req.findings_count} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={req.impact.toUpperCase()}
                                size="small"
                                color={
                                  req.impact === 'critical' || req.impact === 'high'
                                    ? 'error'
                                    : req.impact === 'medium'
                                    ? 'warning'
                                    : 'default'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Non-Compliant Requirements */}
                {framework.requirements.filter((r) => r.status === 'non_compliant').length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'error.main' }}>
                      Non-Compliant Requirements
                    </Typography>
                    <List dense>
                      {framework.requirements
                        .filter((r) => r.status === 'non_compliant')
                        .map((req) => (
                          <ListItem key={req.id} sx={{ mb: 1 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <Error fontSize="small" sx={{ color: 'error.main' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={req.title}
                              secondary={
                                <Typography variant="caption">
                                  {req.remediation}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                    </List>
                  </Box>
                )}

                {/* Resources */}
                {framework.resources && framework.resources.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Resources
                    </Typography>
                    <List dense>
                      {framework.resources.map((resource, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <OpenInNew fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={resource} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </TabPanel>
        ))}
      </Card>

      {/* Export & Share Actions */}
      <Box sx={{ display: 'flex', gap: 1, mt: 3, justifyContent: 'flex-end' }}>
        <Button startIcon={<Download />} variant="outlined">
          Export Report
        </Button>
        <Button startIcon={<Gavel />} variant="outlined">
          View Audit Log
        </Button>
      </Box>
    </Box>
  );
};

export default ComplianceFrameworkViewer;
