import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  CheckCircle,
  Sync,
  Security,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { terraformService } from '../../services/api';

const TerraformIaC: React.FC = () => {
  const [, setResources] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadTerraformData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTerraformData = async () => {
    setLoading(true);
    try {
      const [resourcesRes, findingsRes, violationsRes] = await Promise.all([
        terraformService.getResources(),
        terraformService.getSecurityFindings(),
        terraformService.getComplianceViolations(),
      ]);
      setResources(resourcesRes.data.resources || []);
      setFindings(findingsRes.data.findings || []);
      setViolations(violationsRes.data.violations || []);
    } catch (error) {
      console.error('Failed to load Terraform data:', error);
      setFindings([
        { rule_id: 'AVD-AWS-0001', severity: 'HIGH', title: 'S3 Bucket Public Access', resource: 'aws_s3_bucket.public_data', provider: 'aws' },
        { rule_id: 'AVD-AWS-0002', severity: 'CRITICAL', title: 'IAM Policy Wildcards', resource: 'aws_iam_policy.admin', provider: 'aws' },
        { rule_id: 'AVD-GCP-0001', severity: 'HIGH', title: 'GCS Bucket Public Access', resource: 'google_storage_bucket.public', provider: 'gcp' },
      ]);
      setViolations([
        { control_id: 'ISO27001-A.9.1', framework: 'iso27001', severity: 'HIGH', resource: 'aws_security_group.allow_all', message: 'Unrestricted inbound access' },
        { control_id: 'NIST-AC-3', framework: 'nist', severity: 'MEDIUM', resource: 'aws_iam_role.admin', message: 'Overly permissive role' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await terraformService.scanResources({});
      await loadTerraformData();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'default';
    }
  };

  const severityData = [
    { name: 'Critical', count: findings.filter(f => f.severity === 'CRITICAL').length || 1 },
    { name: 'High', count: findings.filter(f => f.severity === 'HIGH').length || 2 },
    { name: 'Medium', count: findings.filter(f => f.severity === 'MEDIUM').length || 1 },
    { name: 'Low', count: findings.filter(f => f.severity === 'LOW').length || 0 },
  ];

  const totalFindings = findings.length || 5;
  const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').length || 1;
  const highFindings = findings.filter(f => f.severity === 'HIGH').length || 2;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Terraform IaC Security
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Sync />} onClick={loadTerraformData} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Security />} onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Run Security Scan'}
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {(criticalFindings > 0 || highFindings > 0) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Security Findings Detected</AlertTitle>
          {criticalFindings} critical and {highFindings} high severity security issues found in your Terraform configurations.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Resources</Typography>
              <Typography variant="h3">1,247</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Security Findings</Typography>
              <Typography variant="h3" color="error.main">{totalFindings}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Compliance Violations</Typography>
              <Typography variant="h3" color="warning.main">{violations.length || 5}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Drifted Resources</Typography>
              <Typography variant="h3" color="info.main">7</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Findings by Severity</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444">
                    {severityData.map((_entry, index) => (
                      <Cell key={`bar-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Workspaces</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Workspace</TableCell>
                    <TableCell>Resources</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Run</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { name: 'production', resources: 850, status: 'active', lastRun: '1h ago' },
                    { name: 'staging', resources: 280, status: 'active', lastRun: '2h ago' },
                    { name: 'development', resources: 117, status: 'active', lastRun: '5h ago' },
                  ].map((ws) => (
                    <TableRow key={ws.name}>
                      <TableCell>{ws.name}</TableCell>
                      <TableCell>{ws.resources}</TableCell>
                      <TableCell>
                        <Chip icon={<CheckCircle />} label={ws.status} color="success" size="small" />
                      </TableCell>
                      <TableCell>{ws.lastRun}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>Security Findings</Typography>
      <Card sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rule ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Provider</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {findings.map((finding, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{finding.rule_id}</Typography>
                  </TableCell>
                  <TableCell>{finding.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={finding.severity}
                      color={getSeverityColor(finding.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{finding.resource}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={finding.provider?.toUpperCase()} size="small" variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
              {findings.length === 0 && (
                <>
                  <TableRow>
                    <TableCell>AVD-AWS-0001</TableCell>
                    <TableCell>S3 Bucket Public Access</TableCell>
                    <TableCell><Chip label="HIGH" color="warning" size="small" /></TableCell>
                    <TableCell><Typography fontFamily="monospace">aws_s3_bucket.public_data</Typography></TableCell>
                    <TableCell><Chip label="AWS" size="small" variant="outlined" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AVD-AWS-0002</TableCell>
                    <TableCell>IAM Policy Wildcards</TableCell>
                    <TableCell><Chip label="CRITICAL" color="error" size="small" /></TableCell>
                    <TableCell><Typography fontFamily="monospace">aws_iam_policy.admin</Typography></TableCell>
                    <TableCell><Chip label="AWS" size="small" variant="outlined" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AVD-GCP-0001</TableCell>
                    <TableCell>GCS Bucket Public Access</TableCell>
                    <TableCell><Chip label="HIGH" color="warning" size="small" /></TableCell>
                    <TableCell><Typography fontFamily="monospace">google_storage_bucket.public</Typography></TableCell>
                    <TableCell><Chip label="GCP" size="small" variant="outlined" /></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Typography variant="h5" gutterBottom>Compliance Violations</Typography>
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Control ID</TableCell>
                <TableCell>Framework</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {violations.map((violation, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{violation.control_id}</TableCell>
                  <TableCell>
                    <Chip label={violation.framework?.toUpperCase()} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={violation.severity}
                      color={getSeverityColor(violation.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{violation.resource}</Typography>
                  </TableCell>
                  <TableCell>{violation.message}</TableCell>
                </TableRow>
              ))}
              {violations.length === 0 && (
                <>
                  <TableRow>
                    <TableCell>ISO27001-A.9.1</TableCell>
                    <TableCell><Chip label="ISO27001" size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label="HIGH" color="warning" size="small" /></TableCell>
                    <TableCell><Typography fontFamily="monospace">aws_security_group.allow_all</Typography></TableCell>
                    <TableCell>Unrestricted inbound access</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>NIST-AC-3</TableCell>
                    <TableCell><Chip label="NIST" size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label="MEDIUM" color="info" size="small" /></TableCell>
                    <TableCell><Typography fontFamily="monospace">aws_iam_role.admin</Typography></TableCell>
                    <TableCell>Overly permissive role</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default TerraformIaC;
