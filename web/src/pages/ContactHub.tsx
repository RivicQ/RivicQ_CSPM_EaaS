import React from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import SitePage, { siteCardSx } from './SitePage';
import { publishedContacts, mailto } from '../data/contacts';
import { websiteCtaSx } from '../theme/websiteChrome';

const ContactHub: React.FC = () => (
  <SitePage
    eyebrow="RivicQ GmbH · Berlin"
    title="Public desks on @rivicq.com."
    lede="Five addresses for the website and decks. Internal aliases, finance, fundraising, research, and staff mailboxes are not published."
    primary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    secondary={{ label: 'Start security assessment', to: '/' }}
    notice="admin@ is private. Finance, fundraising, research, and staff addresses are not listed here."
  >
    <Grid container spacing={2}>
      {publishedContacts().map((c) => (
        <Grid item xs={12} sm={6} key={c.email}>
          <Box sx={siteCardSx}>
            <Typography sx={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a78bfa' }}>
              {c.label}
            </Typography>
            <Typography sx={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: 700, my: 1 }}>
              {c.email}
            </Typography>
            <Typography variant="body2" sx={{ color: '#d1d5db', mb: 1.5 }}>{c.purpose}</Typography>
            <Button size="small" variant="contained" href={mailto(c.email)} sx={websiteCtaSx}>
              Email
            </Button>
          </Box>
        </Grid>
      ))}
    </Grid>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 4 }}>
      <Button size="small" href={`${process.env.PUBLIC_URL || ''}/docs/index.html`} sx={{ color: '#d1d5db' }}>Documentation</Button>
      <Button size="small" href={`${process.env.PUBLIC_URL || ''}/docs/read.html?doc=LEGAL.md`} sx={{ color: '#d1d5db' }}>Legal</Button>
      <Button size="small" href={`${process.env.PUBLIC_URL || ''}/docs/contact.html`} sx={{ color: '#d1d5db' }}>Docs directory</Button>
    </Stack>
  </SitePage>
);

export default ContactHub;
