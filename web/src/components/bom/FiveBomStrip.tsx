import React from 'react';
import { Box, Chip, Grid, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BOM_LAYERS } from '../../data/bomFramework';
import { GlassCard } from '../ui';
import { tokens } from '../../theme/tokens';

const FiveBomStrip: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
        <Chip
          label="Five-BOM DevSecOps"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: 'center', fontWeight: 700 }}
        />
        <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
          QBOM · AIBOM · SBOM · IBOM · CBOM
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
          One cryptographic intelligence engine. Community runs CBOM, SBOM, and local QBOM.
          AIBOM, IBOM, PKCS#11 HSM, and GRC packs unlock with Enterprise. Partner APIs stay empty without credentials.
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {BOM_LAYERS.map((layer) => (
          <Grid item xs={12} sm={6} md key={layer.id}>
            <GlassCard hover onClick={() => navigate('/login')}>
              <Typography
                variant="overline"
                sx={{ color: layer.community ? tokens.colors.rivicq[600] : 'text.secondary', fontWeight: 800 }}
              >
                {layer.name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1.25, minHeight: 48 }}>{layer.role}</Typography>
              <Chip
                size="small"
                label={layer.community ? 'Community' : 'Enterprise'}
                color={layer.community ? 'primary' : 'default'}
                variant={layer.community ? 'filled' : 'outlined'}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1, color: isDark ? 'text.secondary' : 'text.secondary' }}
              >
                {layer.honesty}
              </Typography>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FiveBomStrip;
