import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export const LoadingScreen: React.FC = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    gap={2}
  >
    <CircularProgress size={48} />
    <Typography variant="body1" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);
