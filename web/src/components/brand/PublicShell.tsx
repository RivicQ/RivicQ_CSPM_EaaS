import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Divider, IconButton, Menu, MenuItem, MenuList, Stack, Typography } from '@mui/material';
import { KeyboardArrowDown, Menu as MenuIcon } from '@mui/icons-material';
import BrandLogo from '../BrandLogo';
import NebulaBackdrop from './NebulaBackdrop';
import TrademarkNotice from '../TrademarkNotice';
import { websiteCtaSx } from '../../theme/websiteChrome';

type NavItem = {
  id: string;
  label: string;
  to?: string;
  items?: { label: string; to: string }[];
};

const NAV: NavItem[] = [
  { id: 'product', label: 'Product', items: [
    { label: 'Product', to: '/product' },
    { label: 'CSPM', to: '/product/cspm' },
    { label: 'CBOM', to: '/cbom' },
    { label: 'Post-quantum', to: '/pqc' },
  ] },
  { id: 'solutions', label: 'Solutions', items: [
    { label: 'Enterprise', to: '/enterprise' },
    { label: 'Security', to: '/security' },
    { label: 'Partners / IBM', to: '/ibm' },
  ] },
  { id: 'pricing', label: 'Pricing', to: '/pricing' },
  { id: 'resources', label: 'Resources', items: [
    { label: 'Documentation', to: 'docs/index.html' },
    { label: 'RivicQ Graph demo', to: 'fabric/' },
    { label: 'Contact', to: '/contact' },
  ] },
];

const PublicShell: React.FC<{ children: React.ReactNode; nebula?: boolean }> = ({ children, nebula = true }) => {
  const navigate = useNavigate();
  const [menu, setMenu] = React.useState<{ id: string; el: HTMLElement } | null>(null);
  const [mobileMenu, setMobileMenu] = React.useState<HTMLElement | null>(null);

  const go = (to: string) => {
    const staticAsset = to.startsWith('http') || to.includes('.html') || !to.startsWith('/');
    if (staticAsset) {
      const url = to.startsWith('http') ? to : `${process.env.PUBLIC_URL || ''}/${to.replace(/^\//, '')}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(to);
  };

  const goAndCloseMobile = (to: string) => {
    setMobileMenu(null);
    go(to);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', position: 'relative' }}>
      {nebula && (
        <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <NebulaBackdrop />
        </Box>
      )}
      <Box sx={{ height: 3, bgcolor: '#7c3aed', position: 'sticky', top: 0, zIndex: 21 }} />
      <Box sx={{ position: 'sticky', top: 3, zIndex: 20, bgcolor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)' }}>
        <Container maxWidth="lg" sx={{ py: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
            <Box
              component="button"
              type="button"
              aria-label="RivicQ home"
              onClick={() => navigate('/')}
              sx={{
                border: 'none',
                background: 'none',
                p: 0,
                m: 0,
                cursor: 'pointer',
                display: 'block',
                borderRadius: 1,
                '&:focus-visible': { outline: '2px solid #7c3aed', outlineOffset: 2 },
              }}
            >
              <BrandLogo dark />
            </Box>
            <Stack direction="row" spacing={0.25} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {NAV.map((item) => (
                <Button
                  key={item.id}
                  size="small"
                  endIcon={item.items ? <KeyboardArrowDown sx={{ fontSize: 16 }} /> : undefined}
                  onClick={(e) => {
                    if (item.items) setMenu({ id: item.id, el: e.currentTarget });
                    else if (item.to) go(item.to);
                  }}
                  sx={{ color: '#fff', fontWeight: 500 }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                aria-label="Open navigation menu"
                aria-haspopup="menu"
                aria-expanded={Boolean(mobileMenu)}
                onClick={(e) => setMobileMenu(e.currentTarget)}
                sx={{ display: { xs: 'inline-flex', md: 'none' }, color: '#fff' }}
              >
                <MenuIcon />
              </IconButton>
              <Button variant="contained" size="small" onClick={() => navigate('/request-demo')} sx={websiteCtaSx}>
                Request demo
              </Button>
            </Stack>
          </Stack>
        </Container>
        <Menu
          anchorEl={mobileMenu}
          open={Boolean(mobileMenu)}
          onClose={() => setMobileMenu(null)}
          slotProps={{ paper: { sx: { bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e', minWidth: 220 } } }}
        >
          <MenuList aria-label="Main navigation" sx={{ py: 0.5 }}>
            {NAV.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <Divider sx={{ borderColor: '#1f1f2e' }} />}
                {item.items ? (
                  item.items.map((sub) => (
                    <MenuItem key={sub.to} onClick={() => goAndCloseMobile(sub.to)} sx={{ color: '#fff' }}>
                      {sub.label}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem onClick={() => goAndCloseMobile(item.to || '/')} sx={{ color: '#fff' }}>
                    {item.label}
                  </MenuItem>
                )}
              </React.Fragment>
            ))}
          </MenuList>
        </Menu>
        <Menu
          anchorEl={menu?.el}
          open={Boolean(menu)}
          onClose={() => setMenu(null)}
          slotProps={{ paper: { sx: { bgcolor: '#0a0a0f', color: '#fff', border: '1px solid #1f1f2e' } } }}
        >
          {NAV.find((n) => n.id === menu?.id)?.items?.map((it) => (
            <MenuItem key={it.to} onClick={() => { go(it.to); setMenu(null); }}>{it.label}</MenuItem>
          ))}
        </Menu>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 3, borderTop: '1px solid #1f1f2e' }}>
        <Stack spacing={1.25} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap justifyContent="center">
            <BrandLogo compact dark />
            <Typography variant="body2" sx={{ color: '#d1d5db' }}>© 2026 RivicQ GmbH · hello@rivicq.com</Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
            <Button size="small" href="mailto:hello@rivicq.com">hello@</Button>
            <Button size="small" href="mailto:sales@rivicq.com">sales@</Button>
            <Button size="small" href="mailto:support@rivicq.com">support@</Button>
            <Button size="small" href="mailto:security@rivicq.com">security@</Button>
            <Button size="small" href="mailto:privacy@rivicq.com">privacy@</Button>
            <Button size="small" onClick={() => navigate('/contact')}>Contact</Button>
          </Stack>
          <TrademarkNotice />
        </Stack>
      </Container>
    </Box>
  );
};

export default PublicShell;
