import React from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { FeedbackOutlined } from '@mui/icons-material';
import { LoadingButton } from './ui';

const KEY = 'rivicq_feedback';

const FeedbackWidget: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const submit = () => {
    try {
      const prev = JSON.parse(localStorage.getItem(KEY) || '[]');
      localStorage.setItem(KEY, JSON.stringify([{ note, at: new Date().toISOString() }, ...(Array.isArray(prev) ? prev : [])].slice(0, 40)));
    } catch {
      // ignore
    }
    setSent(true);
  };

  return (
    <>
      <Tooltip title="Send beta feedback">
        <Fab
          color="primary"
          size="medium"
          onClick={() => { setOpen(true); setSent(false); }}
          sx={{ position: 'fixed', right: 20, bottom: { xs: 80, sm: 24 }, zIndex: 1200 }}
          aria-label="Send beta feedback"
        >
          <FeedbackOutlined />
        </Fab>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Beta feedback</DialogTitle>
        <DialogContent>
          {sent ? (
            <Typography variant="body2">Saved in this workspace. You can also open a GitHub issue for the RivicQ team.</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Tell us what broke, what was confusing, or what a design partner needs next. Nothing leaves this browser unless you also file a GitHub issue.
              </Typography>
              <TextField multiline minRows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should we fix before GA?" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {!sent && (
            <LoadingButton variant="contained" disabled={!note.trim()} onClick={submit}>
              Save feedback
            </LoadingButton>
          )}
          <Button href="https://github.com/RivicQ/RivicQ_CSPM_EaaS/issues/new/choose" target="_blank" rel="noopener noreferrer">
            GitHub issue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FeedbackWidget;
