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
import { Security, Key, Storage } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { ibmCloudService } from '../../services/api';
import TrademarkNotice from '../../components/TrademarkNotice';

const IBMCloud: React.FC = () => {
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['ibm-hpcs-status'],
    queryFn: () => ibmCloudService.getHPCSStatus().then(r => r.data),
    retry: 1,
  });

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['ibm-hpcs-keys'],
    queryFn: () => ibmCloudService.getKeyInventory().then(r => r.data),
    retry: 1,
  });

  const { data: bucketsData } = useQuery({
    queryKey: ['ibm-cos-buckets'],
    queryFn: () => ibmCloudService.getObjectStorageBuckets().then(r => r.data),
    retry: 1,
  });

  const keys: any[] = Array.isArray(keysData) ? keysData : ((keysData as any)?.keys ?? []);
  const buckets: any[] = Array.isArray(bucketsData) ? bucketsData : ((bucketsData as any)?.buckets ?? []);

  if (statusLoading || keysLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        IBM Cloud HPCS
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Optional connector to IBM Hyper Protect Crypto Services. Requires customer IBM Cloud credentials.
      </Typography>
      <TrademarkNotice sx={{ mb: 3 }} />

      {statusError && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your IBM Cloud account to see live HPCS data.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security sx={{ color: '#5a5268', fontSize: 40 }} />
              <Typography variant="h5" fontWeight="bold" mt={1}>
                {(statusData as any)?.status || (statusError ? 'Not connected' : 'Unknown')}
              </Typography>
              <Typography variant="caption" color="text.secondary">HPCS Status</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Key sx={{ color: '#24a148', fontSize: 40 }} />
              <Typography variant="h5" fontWeight="bold" mt={1}>{keys.length}</Typography>
              <Typography variant="caption" color="text.secondary">Managed Keys</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Storage sx={{ color: '#5a5268', fontSize: 40 }} />
              <Typography variant="h5" fontWeight="bold" mt={1}>{buckets.length}</Typography>
              <Typography variant="caption" color="text.secondary">COS Buckets</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Key Inventory</Typography>
              <Divider sx={{ mb: 2 }} />
              {keys.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  No keys found. Connect IBM Cloud to view HPCS keys.
                </Typography>
              ) : (
                <List dense>
                  {keys.map((key: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={key.name || key.id}
                        secondary={key.state || 'Active'}
                      />
                      <Chip label={key.algorithm || 'AES-256'} size="small" />
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
              <Typography variant="h6" gutterBottom>Object Storage Buckets</Typography>
              <Divider sx={{ mb: 2 }} />
              {buckets.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={3}>
                  No buckets found. Connect IBM Cloud to view COS buckets.
                </Typography>
              ) : (
                <List dense>
                  {buckets.map((bucket: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={bucket.name}
                        secondary={bucket.region || 'us-south'}
                      />
                      <Chip
                        label={bucket.encrypted ? 'Encrypted' : 'Unencrypted'}
                        color={bucket.encrypted ? 'success' : 'error'}
                        size="small"
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

export default IBMCloud;
