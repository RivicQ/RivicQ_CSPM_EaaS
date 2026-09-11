import React from 'react';
import {
  Drawer, IconButton, Stack, Typography, Box,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import { helpFor } from '../../ops/helpCopy';

type Props = { open: boolean; onClose: () => void };

const HelpDrawer: React.FC<Props> = ({ open, onClose }) => {
  const location = useLocation();
  const help = helpFor(location.pathname);
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, p: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="overline" color="primary" fontWeight={800}>Contextual help</Typography>
        <IconButton onClick={onClose} aria-label="Close help"><Close /></IconButton>
      </Stack>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>{help.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{help.body}</Typography>
      <Box sx={{ mt: 3, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block">Shortcuts</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace', mt: 0.5 }}>⌘K / Ctrl+K — search</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>? — this panel</Typography>
      </Box>
    </Drawer>
  );
};

export default HelpDrawer;
