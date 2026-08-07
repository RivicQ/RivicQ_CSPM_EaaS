import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Box,
  Collapse,
  IconButton,
} from '@mui/material';
import { Close, RocketLaunch } from '@mui/icons-material';
import { tokens } from '../theme/tokens';

const BETA_SIGN_UP_URL = 'https://github.com/rivic-q/cryptobom-saas/discussions';

/**
 * BetaBanner – shown to OSS users inviting them to join the Enterprise beta.
 * Dismissed state is persisted in localStorage so it doesn't re-appear on
 * every page load.
 */
const BetaBanner: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('betaBannerDismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem('betaBannerDismissed', 'true');
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  return (
    <Collapse in={visible}>
      <Alert
        severity="info"
        icon={<RocketLaunch />}
        sx={{ mb: 3, borderRadius: 3, border: `1px solid ${tokens.colors.rivicq[100]}` }}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            <Button
              size="small"
              variant="contained"
              href={BETA_SIGN_UP_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ background: 'linear-gradient(45deg, #0f62fe, #0043ce)', whiteSpace: 'nowrap' }}
            >
              Join Beta
            </Button>
            <IconButton size="small" onClick={dismiss} aria-label="dismiss beta banner">
              <Close fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>🚀 CryptoBOM Enterprise Beta is Open</AlertTitle>
        You are running the <strong>OSS Edition</strong>, which includes core CBOM scanning.
        Upgrade to <strong>Enterprise</strong> to unlock multi-cloud HSM inventory (AWS CloudHSM,
        IBM HPCS, GCP KMS), IBM Quantum attestation, DORA/BSI compliance reports, and eBPF live
        scanning. <strong>Beta access is free for qualified organisations.</strong>
      </Alert>
    </Collapse>
  );
};

export default BetaBanner;
