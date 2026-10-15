import React from 'react';
import { Box, Container } from '@mui/material';
import NebulaBackdrop from './NebulaBackdrop';
import BrandLogo from '../BrandLogo';
import { NEBULA, archifyAuraLayersSx } from '../../theme/nebulaSurfaces';

const AuthChrome: React.FC<{ children: React.ReactNode; showLogo?: boolean }> = ({
  children,
  showLogo = true,
}) => (
  <Box
    sx={{
      minHeight: '100vh',
      bgcolor: NEBULA.ink,
      color: NEBULA.text,
      py: { xs: 4, md: 8 },
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <NebulaBackdrop />
    <Box aria-hidden sx={archifyAuraLayersSx.radial} />
    <Box aria-hidden sx={archifyAuraLayersSx.grid} />
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
