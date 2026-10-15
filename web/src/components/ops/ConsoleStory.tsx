import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

export type StoryFocus = 'funnel' | 'inventory' | 'migration' | 'scan';

type Props = {
  focus?: StoryFocus;
};

const SURFACES = [
  { name: 'Website', detail: 'Public TLS, certificates, and HTTP headers.' },
  { name: 'Host', detail: 'Declared services and banners on a host you name.' },
  { name: 'Repository', detail: 'Lockfiles, crypto libraries, and secret names.' },
  { name: 'IoT / firmware', detail: 'CycloneDX or hash inventory. Not silicon reverse engineering.' },
  { name: 'Kubernetes', detail: 'Declared pods and manifests.' },
  { name: 'Cloud', detail: 'Enterprise connectors. This Pages build does not scan a live estate.' },
];

const PATH = [
  { step: '1', title: 'First look', detail: 'Public site, labeled demo, or a local CLI run.' },
  { step: '2', title: 'Assessment', detail: 'Point a scan at a website, host, repo, firmware image, Kubernetes manifest, or cloud target.' },
  { step: '3', title: 'Inventory', detail: 'Community CBOM and SBOM. QBOM, HBOM, AIBOM, and IBOM stay Enterprise.' },
  { step: '4', title: 'PQC plan', detail: 'Map classical algorithms to ML-KEM, ML-DSA, and SLH-DSA. Hybrid is the cut-over. Keys are not rotated here.' },
  { step: '5', title: 'Evidence', detail: 'A report you can read. Mappings are not certifications.' },
];

const LENSES = [
  { id: 'CSPM', edition: 'Enterprise', detail: 'Cloud posture. Not executed by the static Pages site.' },
  { id: 'CBOM', edition: 'Community', detail: 'Algorithms, keys, certificates, and libraries.' },
  { id: 'SBOM', edition: 'Community', detail: 'Software components, flagged when they are crypto libraries.' },
  { id: 'HBOM', edition: 'Enterprise', detail: 'Declared hardware, HSM, and TPM inventory.' },
  { id: 'AIBOM', edition: 'Enterprise', detail: 'Declared models and datasets. Not a weight scanner.' },
  { id: 'IBOM', edition: 'Enterprise', detail: 'Identities bound to cryptographic assets.' },
  { id: 'QBOM', edition: 'Enterprise', detail: 'Quantum exposure and replacement. Community still classifies algorithms on the CBOM.' },
];

const ROADMAP = [
  { when: 'Now', detail: 'Community CBOM and SBOM when an engine is running. GitHub Pages is a labeled synthetic demo with no live engine.' },
  { when: 'Next', detail: 'PQC migration plan from that inventory. This build does not rotate production keys.' },
  { when: 'Enterprise', detail: 'CSPM, QBOM, HBOM, AIBOM, IBOM, SSO, and continuous monitoring require a written license.' },
];

const cardSx = {
  p: 1.25,
  borderRadius: 1.5,
  border: '1px solid var(--rq-line)',
  bgcolor: 'var(--rq-surface)',
  minWidth: 0,
  height: '100%',
};

const ConsoleStory: React.FC<Props> = ({ focus = 'funnel' }) => {
  const heading = focus === 'inventory'
    ? 'What this inventory covers'
    : focus === 'migration'
      ? 'How a PQC plan is produced'
      : focus === 'scan'
        ? 'What a scan can see'
        : 'From first look to evidence';

  return (
    <Stack spacing={1.75} sx={{ minWidth: 0 }}>
      <Stack spacing={0.5}>
        <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--rq-muted)' }}>
          Client path · Community and Enterprise
        </Typography>
        <Typography sx={{ fontWeight: 750, fontSize: '1.05rem', color: 'var(--rq-text)', letterSpacing: '-0.02em' }}>
          {heading}
        </Typography>
        <Typography sx={{ color: 'var(--rq-muted)', fontSize: '0.875rem', lineHeight: 1.55, maxWidth: 820 }}>
          GitHub Pages has no live engine. Sample screens are labeled. Control mappings are not certifications, and this site does not publish secrets or customer telemetry.
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1 }}>
        {PATH.map((item) => (
          <Box key={item.step} sx={cardSx}>
            <Typography sx={{ fontSize: 12, fontWeight: 750, color: 'var(--rq-accent)' }}>{item.step}. {item.title}</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12.5, lineHeight: 1.45, color: 'var(--rq-text)' }}>{item.detail}</Typography>
          </Box>
        ))}
      </Box>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75, color: 'var(--rq-text)' }}>Where a scan looks</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1 }}>
          {SURFACES.map((item) => (
            <Box key={item.name} sx={cardSx}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'var(--rq-text)' }}>{item.name}</Typography>
              <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--rq-muted)' }}>{item.detail}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75, color: 'var(--rq-text)' }}>Product lenses</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1 }}>
          {LENSES.map((item) => (
            <Box key={item.id} sx={cardSx}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'var(--rq-text)' }}>{item.id}</Typography>
                <Chip
                  size="small"
                  label={item.edition}
                  sx={{
                    height: 20,
                    color: 'var(--rq-text)',
                    borderColor: 'var(--rq-line)',
                    bgcolor: item.edition === 'Community' ? 'var(--rq-nav-active)' : 'transparent',
                  }}
                  variant="outlined"
                />
              </Stack>
              <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--rq-muted)' }}>{item.detail}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75, color: 'var(--rq-text)' }}>Roadmap</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1 }}>
          {ROADMAP.map((item) => (
            <Box key={item.when} sx={cardSx}>
              <Typography sx={{ fontWeight: 750, fontSize: 13, color: 'var(--rq-accent)' }}>{item.when}</Typography>
              <Typography sx={{ mt: 0.5, fontSize: 12.5, lineHeight: 1.45, color: 'var(--rq-text)' }}>{item.detail}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
};

export default ConsoleStory;
