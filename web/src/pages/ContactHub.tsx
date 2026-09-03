import React from 'react';
import { Alert, Box, Button, Chip, Grid, Stack, Typography } from '@mui/material';
import PageFrame from '../components/PageFrame';
import { GlassCard } from '../components/ui';
import {
  CONTACTS,
  ECOSYSTEM_AREAS,
  contactsByArea,
  publishedPriorityContacts,
  mailto,
} from '../data/contacts';

const ContactHub: React.FC = () => {
  const publishedPriority = publishedPriorityContacts();
  const privateAdmin = CONTACTS.find((c) => c.email === 'admin@rivicq.com');

  return (
    <PageFrame
      eyebrow="RivicQ GmbH"
      title="Contact directory"
      subtitle="One domain: @rivicq.com. Shared inboxes and aliases — not thirty separate mailboxes. admin@ is not published."
      badge="Zoho-centralised"
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        Partner and grant addresses do not imply signed alliances or certifications. Domain administration stays private with MFA. Configure SPF, DKIM, and DMARC on rivicq.com before high-volume mail.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {ECOSYSTEM_AREAS.map((area) => (
          <Grid item xs={12} md={6} lg key={area.id}>
            <GlassCard>
              <Typography variant="overline" color="primary" fontWeight={800}>{area.title}</Typography>
              <Typography variant="body2" color="text.secondary">{area.blurb}</Typography>
            </GlassCard>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Priority inboxes</Typography>
      <Stack spacing={1.25} sx={{ mb: 3.5 }}>
        {publishedPriority.map((c) => (
          <Stack
            key={c.email}
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ md: 'center' }}
            sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
          >
            <Chip size="small" color="primary" label={c.label} />
            <Typography fontFamily="JetBrains Mono, monospace" fontWeight={700} sx={{ minWidth: 280 }}>
              {c.email}
            </Typography>
            <Typography sx={{ flex: 1 }} variant="body2" color="text.secondary">{c.purpose}</Typography>
            <Button size="small" href={mailto(c.email)}>Email</Button>
          </Stack>
        ))}
        {privateAdmin && (
          <Typography variant="caption" color="text.secondary">
            {privateAdmin.label} is reserved and unpublished. Future staff: firstname.lastname@rivicq.com.
          </Typography>
        )}
      </Stack>

      {ECOSYSTEM_AREAS.map((area) => {
        const extras = contactsByArea(area.id).filter((c) => !c.priority);
        if (extras.length === 0) return null;
        return (
          <Box key={area.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>{area.title} aliases</Typography>
            <Stack spacing={1}>
              {extras.map((c) => (
                <Stack
                  key={c.email}
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  alignItems={{ md: 'center' }}
                  sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 2 }}
                >
                  <Chip size="small" label={c.label} />
                  <Typography fontFamily="JetBrains Mono, monospace" fontWeight={700} sx={{ minWidth: 280 }}>
                    {c.email}
                  </Typography>
                  <Typography sx={{ flex: 1 }} variant="body2" color="text.secondary">{c.purpose}</Typography>
                  <Button size="small" href={mailto(c.email)}>Email</Button>
                </Stack>
              ))}
            </Stack>
          </Box>
        );
      })}

      <GlassCard hover={false} padding={2}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>Operator setup</Typography>
        <Typography variant="body2" color="text.secondary">
          Create the twelve priority addresses first. Keep other functions as Zoho aliases or TeamInbox rules so every message has an owner, status, and follow-up date. Finance stays with the founder and accountant; security stays with security leadership; grants stay with the founder and operations. Automated mail uses noreply@.
        </Typography>
      </GlassCard>
    </PageFrame>
  );
};

export default ContactHub;
