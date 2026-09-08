import React from 'react';
import { Alert, Box, Button, Grid, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import { publishedContacts, mailto } from '../data/contacts';

const ContactHub: React.FC = () => {
  return (
    <PageFrame
      eyebrow="RivicQ GmbH"
      title="Contact"
      subtitle="Five public desks on @rivicq.com. Internal aliases and company mailboxes are not published."
      badge="@rivicq.com"
      action={<Button variant="outlined" href={`${process.env.PUBLIC_URL || ''}/docs/contact.html`}>Docs page</Button>}
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        admin@ is private. Finance, fundraising, research, and staff addresses are not listed here.
      </Alert>

      <Grid container spacing={2}>
        {publishedContacts().map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.email}>
            <GlassCard hover={false} padding={2.25}>
              <Typography variant="overline" color="primary" fontWeight={700}>{c.label}</Typography>
              <Typography fontFamily='"Source Code Pro", ui-monospace, monospace' fontWeight={700} sx={{ my: 1 }}>
                {c.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{c.purpose}</Typography>
              <Button size="small" variant="contained" href={mailto(c.email)}>Email</Button>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" href={`${process.env.PUBLIC_URL || ''}/docs/index.html`}>Documentation</Button>
          <Button size="small" href={`${process.env.PUBLIC_URL || ''}/docs/read.html?doc=LEGAL.md`}>Legal</Button>
        </Stack>
      </Box>
    </PageFrame>
  );
};

export default ContactHub;
