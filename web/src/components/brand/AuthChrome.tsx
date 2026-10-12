import React from 'react';
import { Box, Container, useTheme } from '@mui/material';
import NebulaBackdrop from '../brand/NebulaBackdrop';
import BrandLogo from '../BrandLogo';

const AuthChrome: React.FC<{ children: React.ReactNode; showLogo?: boolean }> = ({
  children,
  showLogo = true,
}) => {
  const isDark = useTheme().palette.mode === 'dark';
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 8 }, position: 'relative', overflow: 'hidden' }}>
      {isDark && <NebulaBackdrop />}
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        {showLogo && (
          <Box sx={{ mb: 3 }}>
            <BrandLogo dark={isDark} />
          </Box>
        )}
        {children}
      </Container>
    </Box>
  );
};

export default AuthChrome;
