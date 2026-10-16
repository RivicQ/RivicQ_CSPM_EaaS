import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Link, Stack, Typography,
} from '@mui/material';
import { ArrowForward, ContentCopy } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useDemoTrail } from '../context/DemoTrailContext';
import BrandLogo from '../components/BrandLogo';
import { LoadingButton } from '../components/ui';
import { DEMO_TRAIL_STEPS } from '../demo/trail';
import { NEBULA } from '../theme/nebulaSurfaces';

const FONT_TITLE = '"Space Grotesk", Inter, system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

const DemoWelcome: React.FC = () => {
  const navigate = useNavigate();
  const { demoLogin, isAuthenticated, isDemo, backendReachable } = useAuth();
  const { start, skip } = useDemoTrail();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const enterDemo = async (withTrail: boolean) => {
    setLoading(true);
    setError('');
    try {
      if (!isAuthenticated || !isDemo) {
        await demoLogin('community');
      }
      if (withTrail) {
        start();
      } else {
        skip();
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Demo access is unavailable on this deployment.');
    } finally {
      setLoading(false);
    }
  };

  const copyScan = async () => {
    try {
      await navigator.clipboard.writeText('rivicq scan .');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const receipt = [
    { value: '7', label: 'Trail steps' },
    { value: '2', label: 'CBOM + SBOM' },
    { value: 'DEMO', label: 'Labeled sample' },
    { value: '0', label: 'Cert claims' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: NEBULA.ink, color: NEBULA.text }}>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <BrandLogo dark />
            <Box
              sx={{
                px: 0.75,
                py: 0.2,
                border: '1px solid',
                borderColor: NEBULA.line,
                borderRadius: 1,
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: NEBULA.faint,
              }}
            >
              Community demo
            </Box>
          </Stack>

          <Box>
            <Typography
              component="h1"
              sx={{
                fontFamily: FONT_TITLE,
                fontWeight: 500,
                fontSize: { xs: '1.5rem', md: '1.75rem' },
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
              }}
            >
              Try cryptographic posture on labeled sample data.
            </Typography>
            <Typography sx={{ mt: 1, maxWidth: '62ch', fontSize: '0.875rem', lineHeight: 1.5, color: NEBULA.muted }}>
              Discover cryptography, classify PQC, read the CBOM. Enterprise connectors stay locked. Mappings are not certifications.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 40,
                px: 1,
                border: '1px solid',
                borderColor: NEBULA.line,
                borderRadius: 1,
                bgcolor: NEBULA.panel,
                fontFamily: FONT_MONO,
                fontSize: '0.75rem',
              }}
            >
              <Box component="span" sx={{ color: NEBULA.faint }}>$</Box>
              <Box component="code" sx={{ fontFamily: 'inherit', flex: 1 }}>rivicq scan .</Box>
              <Button size="small" onClick={copyScan} startIcon={<ContentCopy sx={{ fontSize: 14 }} />} sx={{ minHeight: 28, textTransform: 'none' }}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Box>
            <LoadingButton
              variant="contained"
              size="small"
              loading={loading}
              loadingText="Opening…"
              endIcon={<ArrowForward />}
              onClick={() => enterDemo(true)}
              sx={{ minHeight: 40, textTransform: 'none', bgcolor: NEBULA.accent, boxShadow: 'none' }}
            >
              Start trail
            </LoadingButton>
            <Button
              size="small"
              disabled={loading}
              onClick={() => enterDemo(false)}
              sx={{
                minHeight: 40,
                textTransform: 'none',
                border: '1px solid',
                borderColor: NEBULA.line,
                color: NEBULA.text,
              }}
            >
              Open dashboard
            </Button>
          </Stack>

          {error && (
            <Typography role="alert" color="error" variant="body2">{error}</Typography>
          )}

          <Typography sx={{ fontSize: '0.75rem', color: NEBULA.faint }}>
            {backendReachable
              ? 'Demo uses GET /auth/demo as a Community workspace.'
              : 'This GitHub Pages build has no live API — labeled sample data only.'}
            {' · '}
            <Link
              component="button"
              type="button"
              onClick={() => {
                skip();
                navigate(isAuthenticated ? '/dashboard' : '/login');
              }}
              sx={{ color: NEBULA.muted, cursor: 'pointer', border: 0, background: 'none', font: 'inherit' }}
            >
              Skip tour
            </Link>
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {receipt.map((item) => (
              <Box
                key={item.label}
                sx={{
                  minWidth: 110,
                  px: 1.25,
                  py: 0.75,
                  border: '1px solid',
                  borderColor: NEBULA.line,
                  borderRadius: 1,
                  bgcolor: NEBULA.panel,
                }}
              >
                <Typography sx={{ fontFamily: FONT_TITLE, fontSize: '1.125rem', fontWeight: 600 }}>{item.value}</Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: NEBULA.faint }}>{item.label}</Typography>
              </Box>
            ))}
          </Stack>

          <Box sx={{ border: '1px solid', borderColor: NEBULA.line, borderRadius: 1, overflow: 'hidden', bgcolor: NEBULA.panel }}>
            {DEMO_TRAIL_STEPS.slice(1).map((step, i) => (
              <Box
                key={step.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '36px 1fr', sm: '36px 180px 1fr' },
                  gap: 1,
                  alignItems: 'baseline',
                  px: 1.25,
                  py: 0.85,
                  borderBottom: i === DEMO_TRAIL_STEPS.slice(1).length - 1 ? 'none' : `1px solid ${NEBULA.line}`,
                }}
              >
                <Typography sx={{ fontFamily: FONT_MONO, fontSize: '0.6875rem', color: NEBULA.faint }}>
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{step.title}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: NEBULA.muted, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                  {step.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default DemoWelcome;
