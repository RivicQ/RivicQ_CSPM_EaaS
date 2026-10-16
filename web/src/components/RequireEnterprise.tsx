import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { WorkspacePremium } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition, isEnterpriseEdition } from '../config/editions';
import { NEBULA } from '../theme/nebulaSurfaces';

const RequireEnterprise: React.FC<{ children: React.ReactElement; layers?: boolean }> = ({ children, layers }) => {
  const { edition } = useAuth();
  const navigate = useNavigate();
  const allowed = layers ? isEnterpriseEdition(edition) : isPaidEdition(edition);

  if (!allowed) {
    return (
      <Box
        sx={{
          maxWidth: 420,
          p: 1.5,
          border: '1px solid',
          borderColor: NEBULA.line,
          borderRadius: 1,
          bgcolor: NEBULA.panel,
        }}
      >
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, mb: 0.5 }}>Enterprise layer locked</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: NEBULA.muted, mb: 1, lineHeight: 1.4 }}>
          Community is CBOM, SBOM, scanner, and the policy gate. QBOM, HBOM, AIBOM, IBOM, HSM, and GRC packs stay licensed.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" startIcon={<WorkspacePremium />} onClick={() => navigate('/switcher')} sx={{ textTransform: 'none' }}>
            Choose edition
          </Button>
          <Button size="small" onClick={() => navigate('/dashboard')} sx={{ textTransform: 'none' }}>
            Dashboard
          </Button>
        </Stack>
      </Box>
    );
  }

  return children;
};

export default RequireEnterprise;
