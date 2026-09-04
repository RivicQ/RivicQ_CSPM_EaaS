import React from 'react';
import { Alert, Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import {
  ECOSYSTEM_AREAS,
  contactsByArea,
  mailto,
} from '../data/contacts';

const ContactHub: React.FC = () => {
  return (
    <PageFrame
      eyebrow="RivicQ GmbH"
      title="Contact directory"
      subtitle="One domain: @rivicq.com. Shared inboxes and aliases — not thirty paid mailboxes. admin@ is not published."
      badge="@rivicq.com"
      action={<Button variant="outlined" href={`${process.env.PUBLIC_URL || ''}/docs/contact.html`}>Docs page</Button>}
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        Partner and grant addresses do not imply signed alliances or certifications. Domain administration stays private with MFA.
      </Alert>

      <Grid container spacing={2}>
        {ECOSYSTEM_AREAS.map((area) => {
          const rows = contactsByArea(area.id);
          return (
            <Grid item xs={12} md={6} key={area.id}>
              <GlassCard hover={false} padding={2.25}>
                <Typography variant="overline" color="primary" fontWeight={800}>{area.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{area.blurb}</Typography>
                <Stack spacing={1}>
                  {rows.map((c) => (
                    <Stack
                      key={c.email}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ sm: 'center' }}
                      sx={{ py: 0.75, borderTop: 1, borderColor: 'divider' }}
                    >
                      <Chip size="small" color={c.priority ? 'primary' : 'default'} label={c.label} />
                      <Typography fontFamily="JetBrains Mono, monospace" fontWeight={700} sx={{ flex: 1 }}>
                        {c.email}
                      </Typography>
                      <Button size="small" variant="contained" href={mailto(c.email)}>Email</Button>
                    </Stack>
                  ))}
                </Stack>
              </GlassCard>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Founder: revansai.ande@rivicq.com. Future staff: firstname.lastname@rivicq.com. Extra aliases (demo@, regional, noreply@) stay as Zoho forwards.
        </Typography>
      </Box>
    </PageFrame>
  );
};

export default ContactHub;
