import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Grid, Link, Stack, Typography,
} from '@mui/material';
import { ArrowForward, ContentCopy } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useDemoTrail } from '../context/DemoTrailContext';
import BrandLogo from '../components/BrandLogo';
import { LoadingButton } from '../components/ui';
import { DEMO_TRAIL_STEPS } from '../demo/trail';
import ArchifyWorkflowEmbed from '../components/brand/ArchifyWorkflowEmbed';
import { NEBULA, nebulaPanelSx } from '../theme/nebulaSurfaces';

const FONT_TITLE = '"Space Grotesk", Inter, system-ui, sans-serif';
const FONT_DISPLAY = 'Fraunces, Georgia, serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
const ARCHIFY_SITE = `${process.env.PUBLIC_URL || ''}/archify/site/index.html`;

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
    { value: '7', label: 'Guided steps · Community trail' },
    { value: '2', label: 'BOM layers · CBOM + SBOM' },
    { value: '1', label: 'Engine · labeled DEMO data' },
    { value: '0', label: 'Cert claims · mappings only' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: NEBULA.ink,
        color: NEBULA.text,
        position: 'relative',
        overflow: 'hidden',
        pb: { xs: 8, md: 12 },
      }}
    >
      {/* Archify-style hero aura + horizon */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 50% 45% at 50% 0%, rgba(56,189,248,0.06), transparent 70%),
            radial-gradient(ellipse 55% 48% at 50% 18%, rgba(124,58,237,0.28), transparent 68%)
          `,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.9,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          backgroundPosition: 'center top',
          maskImage: 'radial-gradient(ellipse 60% 75% at 50% 30%, #000 10%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 75% at 50% 30%, #000 10%, transparent 75%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: { xs: '-55vw', md: '-42vw' },
          width: '160vw',
          height: '130vw',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${NEBULA.ink} 97%, transparent 100%)`,
          boxShadow: `
            0 -1px 0 0 rgba(167,139,250,0.45),
            0 -18px 60px -10px rgba(124,58,237,0.45),
            0 -80px 160px -20px rgba(124,58,237,0.22),
            inset 0 30px 60px -30px rgba(124,58,237,0.28)
          `,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: { xs: 5, md: 8 } }}>
        <Stack spacing={0} alignItems="center" textAlign="center">
          <Box sx={{ mb: 2.5 }}>
            <BrandLogo dark />
          </Box>

          <Box
            component="a"
            href={ARCHIFY_SITE}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.1,
              py: 0.4,
              pl: 0.45,
              mb: 2.5,
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.03)',
              color: 'rgba(209,213,219,0.92)',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              '&:hover': { borderColor: 'rgba(124,58,237,0.5)', color: NEBULA.text },
            }}
          >
            <Box
              component="span"
              sx={{
                px: 0.9,
                py: 0.35,
                borderRadius: 999,
                bgcolor: NEBULA.accent,
                color: '#fff',
                fontFamily: FONT_MONO,
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              Live demo
            </Box>
            <Box component="span">Archify maps · Community trail · Berlin</Box>
            <Box component="span" sx={{ color: 'rgba(156,163,175,0.88)' }}>→</Box>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontFamily: FONT_TITLE,
              fontWeight: 500,
              fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4.2rem' },
              lineHeight: 0.98,
              letterSpacing: '-0.045em',
              maxWidth: 920,
              textWrap: 'balance',
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'block',
                background: 'linear-gradient(180deg, #fff 0%, #fff 62%, rgba(209,213,219,0.72) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                pb: 0.5,
              }}
            >
              Try the posture once.
            </Box>
            <Box component="span" sx={{ display: 'block' }}>
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(180deg, #fff 0%, #fff 62%, rgba(209,213,219,0.72) 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Leave with a map{' '}
              </Box>
              <Box
                component="em"
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  letterSpacing: '-0.03em',
                  background: 'linear-gradient(100deg, #a78bfa 0%, #7c3aed 45%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                you can trust.
              </Box>
            </Box>
          </Typography>

          <Typography
            sx={{
              mt: 2.5,
              maxWidth: '64ch',
              fontSize: { xs: '1rem', md: '1.0625rem' },
              lineHeight: 1.65,
              color: 'rgba(209,213,219,0.92)',
            }}
          >
            Limited Community demo: discover cryptography, map PQC mitigations, and read the CBOM report.
            Sample data is labeled DEMO. Enterprise connectors stay locked. Control mappings are not certifications.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            alignItems="center"
            justifyContent="center"
            sx={{ mt: 3.5, width: '100%', maxWidth: 720 }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 44,
                px: 0.5,
                pl: 1.5,
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '10px',
                bgcolor: 'rgba(0,0,0,0.8)',
                fontFamily: FONT_MONO,
                fontSize: '0.8125rem',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Box component="span" sx={{ color: '#a78bfa' }}>$</Box>
              <Box component="code" sx={{ fontFamily: 'inherit', flex: 1 }}>rivicq scan .</Box>
              <Button
                size="small"
                onClick={copyScan}
                startIcon={<ContentCopy sx={{ fontSize: 14 }} />}
                sx={{
                  minHeight: 34,
                  px: 1,
                  borderRadius: '7px',
                  bgcolor: 'rgba(255,255,255,0.06)',
                  color: copied ? '#38bdf8' : 'rgba(209,213,219,0.92)',
                  fontFamily: FONT_MONO,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.04em',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', color: NEBULA.text },
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Box>

            <LoadingButton
              variant="contained"
              size="large"
              loading={loading}
              loadingText="Opening…"
              endIcon={<ArrowForward />}
              onClick={() => enterDemo(true)}
              sx={{
                minHeight: 44,
                px: 2,
                borderRadius: '10px',
                bgcolor: '#fff',
                color: '#0a0b0d',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: NEBULA.accent, color: '#fff', boxShadow: '0 8px 28px -6px rgba(124,58,237,0.6)' },
              }}
            >
              Start live demo
            </LoadingButton>

            <Button
              size="large"
              disabled={loading}
              onClick={() => enterDemo(false)}
              sx={{
                minHeight: 44,
                px: 2,
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.14)',
                bgcolor: 'rgba(255,255,255,0.03)',
                color: NEBULA.text,
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  mr: 1,
                  borderRadius: '50%',
                  bgcolor: NEBULA.accent,
                  color: '#fff',
                  fontSize: 10,
                }}
              >
                ▶
              </Box>
              Explore dashboard
            </Button>
          </Stack>

          {error && (
            <Typography role="alert" color="error" variant="body2" sx={{ mt: 2 }}>{error}</Typography>
          )}

          <Typography sx={{ mt: 2.5, fontSize: '0.8125rem', color: 'rgba(156,163,175,0.88)', maxWidth: 640 }}>
            {backendReachable
              ? 'Demo access uses GET /auth/demo as a Community workspace. It cannot see customer data.'
              : 'This GitHub Pages build has no live API — labeled sample data only, not a production login.'}
            {' · '}
            <Link
              component="button"
              type="button"
              onClick={() => {
                skip();
                navigate(isAuthenticated ? '/dashboard' : '/login');
              }}
              sx={{ color: 'rgba(209,213,219,0.92)', textDecoration: 'underline', cursor: 'pointer', border: 0, background: 'none', font: 'inherit' }}
            >
              Skip tour
            </Link>
            {' · '}
            <Link href={ARCHIFY_SITE} target="_blank" rel="noopener noreferrer" sx={{ color: 'rgba(209,213,219,0.92)' }}>
              Open Archify maps
            </Link>
          </Typography>
        </Stack>

        {/* Receipts row — Archify glance strip */}
        <Grid container spacing={1.5} sx={{ mt: { xs: 5, md: 7 } }}>
          {receipt.map((item) => (
            <Grid item xs={6} md={3} key={item.label}>
              <Box
                sx={{
                  ...nebulaPanelSx,
                  p: 2,
                  textAlign: 'left',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Typography sx={{ fontFamily: FONT_TITLE, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.03em' }}>
                  {item.value}
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', color: 'rgba(156,163,175,0.88)', lineHeight: 1.45 }}>
                  {item.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Trail steps as Archify plate cards */}
        <Box sx={{ mt: { xs: 5, md: 7 } }}>
          <Typography
            sx={{
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(156,163,175,0.88)',
              mb: 1,
            }}
          >
            What you will walk through
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_TITLE,
              fontWeight: 500,
              fontSize: { xs: '1.5rem', md: '1.85rem' },
              letterSpacing: '-0.03em',
              mb: 2.5,
              maxWidth: 560,
            }}
          >
            Same operator path as the Archify maps — discover, classify, gate, report.
          </Typography>
          <Grid container spacing={1.5}>
            {DEMO_TRAIL_STEPS.slice(1).map((step, i) => (
              <Grid item xs={12} sm={6} md={4} key={step.id}>
                <Box
                  sx={{
                    ...nebulaPanelSx,
                    p: 2.25,
                    height: '100%',
                    borderColor: 'rgba(255,255,255,0.1)',
                    transition: 'border-color 0.18s ease',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.28)' },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#a78bfa',
                      letterSpacing: '0.04em',
                      mb: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT_TITLE, fontWeight: 600, letterSpacing: '-0.02em', mb: 0.75 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(209,213,219,0.88)', lineHeight: 1.55 }}>
                    {step.body}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        <ArchifyWorkflowEmbed />
      </Container>
    </Box>
  );
};

export default DemoWelcome;
