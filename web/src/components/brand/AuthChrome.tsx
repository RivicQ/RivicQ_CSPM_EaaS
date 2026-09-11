import React from 'react';
import { Box, Container } from '@mui/material';
import NebulaBackdrop from '../brand/NebulaBackdrop';
import BrandLogo from '../BrandLogo';

const AuthChrome: React.FC<{ children: React.ReactNode; showLogo?: boolean }> = ({
  children,
  showLogo = true,
}) => (
  <Box sx={{ minHeight: '100vh', bgcolor: '#000', py: { xs: 4, md: 8 }, position: 'relative', overflow: 'hidden' }}>
    <NebulaBackdrop />
    <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
      {showLogo && (
        <Box sx={{ mb: 3 }}>
          <BrandLogo dark />
        </Box>
      )}
      {children}
    </Container>
  </Box>
);

export default AuthChrome;
