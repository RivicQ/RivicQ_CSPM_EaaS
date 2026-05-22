import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';

const CSPM: React.FC = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">CSPM Control Center</Typography>
        <Button variant="contained">Refresh</Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="body1" color="textSecondary">
            Cloud Security Posture Management (CSPM) surfaces live inventory, compliance controls, and posture checks.
            This page requires a live backend and is only enabled for Enterprise editions.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CSPM;
