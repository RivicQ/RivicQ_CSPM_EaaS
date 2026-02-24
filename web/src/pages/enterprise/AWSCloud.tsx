import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Security, VpnKey, CloudQueue } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { awsCloudService } from '../../services/api';

const AWSCloud: React.FC = () => {
  const { data: hsmData, isLoading, error } = useQuery({
    queryKey: ['aws-cloudhsm-status'],
    queryFn: () => awsCloudService.getCloudHSMStatus().then(r => r.data),
    retry: 1,
  });

  const { data: kmsData } = useQuery({
    queryKey: ['aws-kms-keys'],
    queryFn: () => awsCloudService.getKMSKeys().then(r => r.data),
    retry: 1,
  });

  const { data: auditData } = useQuery({
    queryKey: ['aws-cloudtrail-audit'],
    queryFn: () => awsCloudService.getCloudTrailAudit().then(r => r.data),
    retry: 1,
  });

  const kmsKeys: any[] = Array.isArray(kmsData) ? kmsData : ((kmsData as any)?.keys ?? []);
  const auditEvents: any[] = Array.isArray(auditData) ? auditData : ((auditData as any)?.events ?? []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        AWS Cloud HSM
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        AWS CloudHSM and KMS key management overview
      </Typography>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your AWS account to see live CloudHSM data.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security sx={{ color: '#f59e0b', fontSize: 40 }} />
              <Typography variant="h5" fontWeight="bold" mt={1}>
                {(hsmData as any)?.cluster_count ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">HSM Clusters</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <VpnKey sx={{ color: '#667eea', fontSize: 40 }} />
              <Typography variant="h5" fontWeight="bold" mt={1}>{kmsKeys.length}</Typography>
              <Typography variant="caption" color="text.secondary">KMS Keys</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CloudQueue sx={{ color: '#10b981', fontSize: 40 }} />
              <Typography variant="h5" fontWeight="bold" mt={1}>{auditEvents.length}</Typography>
              <Typography variant="caption" color="text.secondary">Audit Events</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>KMS Keys</Typography>
              <Divider sx={{ mb: 2 }} />
              {kmsKeys.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  No KMS keys found. Connect AWS to view keys.
                </Typography>
              ) : (
                <List dense>
                  {kmsKeys.map((key: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={key.KeyId || key.id}
                        secondary={key.Description || key.alias}
                      />
                      <Chip label={key.KeyState || 'Enabled'} size="small" color="success" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>CloudTrail Audit</Typography>
              <Divider sx={{ mb: 2 }} />
              {auditEvents.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  No audit events. Connect AWS CloudTrail to view crypto events.
                </Typography>
              ) : (
                <List dense>
                  {auditEvents.slice(0, 10).map((event: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={event.eventName || event.name}
                        secondary={event.eventTime || event.time}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AWSCloud;
