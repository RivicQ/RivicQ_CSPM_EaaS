import React from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import SitePage, { siteCardSx } from './SitePage';
import { publishedContacts, mailto } from '../data/contacts';
import { websiteCtaSx } from '../theme/websiteChrome';
import { archifyDocsHref } from '../theme/docsLink';
import { tokens } from '../theme/tokens';

const ContactHub: React.FC = () => (
  <SitePage
    eyebrow="Contact · RivicQ GmbH · Berlin"
    title="Public desks on @rivicq.com."
    lede="Five addresses for the website and decks. Internal aliases, finance, fundraising, research, and staff mailboxes are not published. Prefer the desk that matches your intent."
    primary={{ label: 'Request enterprise demo', to: '/request-demo' }}
    secondary={{ label: 'Start security assessment', to: '/' }}
    notice="admin@ is private. Finance, fundraising, research, and staff addresses are not listed here."
    sectionEyebrow="Directory"
    sectionTitle="Pick the public desk that matches your request."
    diagramKicker="Contact · operator workflow"
    diagramTitle="Talk to the right desk — then follow the same discover → report path in the product."
  >
    <Grid container spacing={1.5} alignItems="stretch" sx={{ mb: 1 }}>
      {publishedContacts().map((c, i) => (
        <Grid item xs={12} sm={6} key={c.email}>
          <Box sx={siteCardSx}>
            <Typography
              sx={{
                fontFamily: ARCHIFY_FONTS.mono,
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#a78bfa',
                letterSpacing: '0.04em',
                mb: 1,
              }}
            >
              {String(i + 1).padStart(2, '0')} · {c.label}
            </Typography>
            <Typography sx={{ fontFamily: tokens.typography.mono, fontWeight: 700, my: 1 }}>
              {c.email}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, flex: 1, lineHeight: 1.6 }}>{c.purpose}</Typography>
            <Button size="small" variant="contained" href={mailto(c.email)} sx={{ ...websiteCtaSx, alignSelf: 'flex-start', borderRadius: '10px', textTransform: 'none' }}>
              Email {c.label.toLowerCase()}
            </Button>
          </Box>
        </Grid>
      ))}
    </Grid>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 4 }}>
      <Button size="small" href={archifyDocsHref()} sx={{ color: 'text.secondary' }}>Documentation</Button>
      <Button size="small" href={archifyDocsHref('legal')} sx={{ color: 'text.secondary' }}>Legal</Button>
      <Button size="small" href={archifyDocsHref('contact')} sx={{ color: 'text.secondary' }}>Contact notes</Button>
    </Stack>
  </SitePage>
);

export default ContactHub;
