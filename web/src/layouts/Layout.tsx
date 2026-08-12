import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
  InputBase,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Storage,
  Security,
  Assessment,
  Analytics,
  Settings,
  Refresh,
  Notifications,
  Cloud,
  Psychology,
  GitHub,
  CloudQueue,
  Category,
  Lock,
  WorkspacePremium,
  GppGood,
  FactCheck,
  Search,
  ExpandMore,
  ChevronRight,
  Logout,
  Person,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';
import { MODULES } from '../config/modules';
import { useThemeMode } from '../theme/ThemeContext';
import ThemeToggle from '../theme/ThemeToggle';
import BrandLogo from '../components/BrandLogo';
import RivicQAssistant from '../components/assistant/RivicQAssistant';
import designSystem, {
  sidebarPaperSx,
  sidebarScrollSx,
  sidebarSectionLabelSx,
  sidebarNavItemButtonSx,
  appBarPaperSx,
  appBarSearchSx,
  appBarIconButtonSx,
  appBarEditionChipSx,
  appBarPageTitleSx,
  appBarPageEyebrowSx,
} from '../theme/designSystem';

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
  section?: string;
  disabled?: boolean;
}

const DRAWER_WIDTH = 260;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, edition, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [notifications] = React.useState(5);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [modulesOpen, setModulesOpen] = React.useState(false);
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const navigationItems: NavItem[] = [
    { text: 'Command Center', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Assets', icon: <Storage />, path: '/assets' },
    { text: 'Scanner', icon: <Security />, path: '/scanner' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'DevSecOps Tools', icon: <Category />, path: '/tools' },
    { text: 'RivicQ Ecosystem', icon: <CloudQueue />, path: '/ecosystem' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  const enterpriseItems: NavItem[] = [
    { text: 'Cloud Posture', icon: <GppGood />, path: '/enterprise/cloud-posture', section: 'Enterprise' },
    { text: 'Conformance Packs', icon: <FactCheck />, path: '/enterprise/conformance-packs', section: 'Enterprise' },
    { text: 'Inventory', icon: <Storage />, path: '/enterprise/inventory', section: 'Enterprise' },
    { text: 'Compliance', icon: <Assessment />, path: '/enterprise/compliance', section: 'Enterprise' },
    { text: 'Quantum', icon: <Psychology />, path: '/enterprise/quantum', section: 'Enterprise' },
    { text: 'Multi-Cloud', icon: <Cloud />, path: '/enterprise/multicloud', section: 'Enterprise' },
    { text: 'CNCF Tools', icon: <CloudQueue />, path: '/enterprise/cncf', section: 'Enterprise' },
    { text: 'Terraform', icon: <GitHub />, path: '/enterprise/terraform', section: 'Enterprise' },
    { text: 'CSPM', icon: <GppGood />, path: '/enterprise/cspm', section: 'Enterprise' },
  ];

  const enterpriseNav = enterpriseItems.map((it) => ({ ...it, disabled: !isPaidEdition(edition) }));

  const modulesNav: NavItem[] = [
    { text: 'All Modules', icon: <Category />, path: '/modules', section: 'Security Modules' },
    ...MODULES.map((m) => {
      const Icon = m.icon;
      return { text: m.name, icon: <Icon />, path: `/modules/${m.id}`, section: 'Security Modules' };
    }),
  ].map((it) => ({ ...it, disabled: !isPaidEdition(edition) }));

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const currentSection = React.useMemo(() => {
    if (enterpriseItems.some((it) => isActive(it.path))) return 'Enterprise';
    if (location.pathname.startsWith('/modules')) return 'Security Modules';
    return 'Workspace';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const blue = designSystem.proBlue;
  const isDarkMode = mode === 'dark';

  const currentTitle = React.useMemo(() => {
    const all = [...navigationItems, ...enterpriseItems, ...modulesNav];
    const active = all.find((it) => it.path !== '/modules' && isActive(it.path));
    if (location.pathname.startsWith('/modules/') && location.pathname !== '/modules') {
      const m = MODULES.find((x) => x.id === location.pathname.split('/')[2]);
      return m?.name ?? 'Security Module';
    }
    return active?.text ?? 'Command Center';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const renderNavItem = (item: NavItem, dense = false) => {
    const active = isActive(item.path);
    return (
      <ListItem key={item.path} disablePadding sx={{ mb: dense ? 0 : 0.125, px: 1.5 }}>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          selected={active}
          disabled={item.disabled}
          sx={sidebarNavItemButtonSx(active, !!item.disabled)}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 32, '& svg': { fontSize: 18 } }}>
            {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: '-0.01em' }}
          />
          {item.disabled && (
            <Tooltip title="Enterprise feature — upgrade to unlock">
              <Lock sx={{ fontSize: 12, color: 'text.disabled', opacity: 0.6 }} />
            </Tooltip>
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0, position: 'relative', color: designSystem.proBlue.textPrimary }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${designSystem.proBlue.accentLight}, ${designSystem.proBlue.accent})`,
          borderRadius: '0 4px 4px 0',
        }}
      />
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', position: 'relative', flexShrink: 0 }}>
        <BrandLogo compact dark />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ flexShrink: 0, py: 0.75 }}>
          <List sx={{ px: 0, py: 0 }}>
            <Typography variant="caption" sx={sidebarSectionLabelSx}>
              Workspace
            </Typography>
            {navigationItems.map((item) => renderNavItem(item))}
          </List>

          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />

          <List sx={{ px: 0, py: 0 }}>
            <Typography variant="caption" sx={sidebarSectionLabelSx}>
              Enterprise
            </Typography>
            {enterpriseNav.map((item) => renderNavItem(item))}
          </List>

          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />

          <List sx={{ px: 0, py: 0 }}>
            <ListItem disablePadding sx={{ px: 1.5, mb: 0.125 }}>
              <ListItemButton
                onClick={() => setModulesOpen((v) => !v)}
                disabled={!isPaidEdition(edition)}
                sx={{
                  ...sidebarNavItemButtonSx(false, !isPaidEdition(edition)),
                  py: 0.5,
                  minHeight: 32,
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 32, '& svg': { fontSize: 18 } }}>
                  <Category />
                </ListItemIcon>
                <ListItemText primary="Security Modules" primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
                {isPaidEdition(edition) ? (
                  modulesOpen ? <ExpandMore sx={{ fontSize: 16 }} /> : <ChevronRight sx={{ fontSize: 16 }} />
                ) : (
                  <Tooltip title="Paid edition feature — upgrade to enable">
                    <Lock sx={{ fontSize: 12, color: 'text.disabled' }} />
                  </Tooltip>
                )}
              </ListItemButton>
            </ListItem>
          </List>
        </Box>

        {modulesOpen && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              ...sidebarScrollSx,
            }}
          >
            <List disablePadding sx={{ pl: 1, pr: 0.5, pb: 0.5 }}>
              {modulesNav.map((item) => renderNavItem(item, true))}
            </List>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      <Box sx={{ p: 1, position: 'relative', flexShrink: 0 }}>
        <Stack spacing={0.75}>
          {!isPaidEdition(edition) && (
            <Chip
              icon={<WorkspacePremium sx={{ fontSize: 14, color: `${designSystem.proBlue.accentMuted} !important` }} />}
              label="Upgrade to Enterprise"
              size="small"
              variant="outlined"
              onClick={() => navigate('/switcher')}
              sx={{
                width: '100%',
                justifyContent: 'flex-start',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                borderStyle: 'dashed',
                color: designSystem.proBlue.textSecondary,
                borderColor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: designSystem.proBlue.navHover },
              }}
            />
          )}
          <Chip
            icon={<Psychology sx={{ fontSize: 14, color: '#c4b5fd !important' }} />}
            label="PQC Ready"
            size="small"
            sx={{
              width: '100%',
              justifyContent: 'flex-start',
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: 'rgba(124,58,237,0.2)',
              color: '#ddd6fe',
              border: 1,
              borderColor: 'rgba(196,181,253,0.25)',
            }}
          />
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          ...appBarPaperSx(mode),
        }}
      >
        <Toolbar sx={{ minHeight: 60, gap: 1.25, px: { xs: 1.5, md: 2.5 } }}>
          {!isDesktop && (
            <IconButton
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ ...appBarIconButtonSx(mode), mr: 0.25 }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {!isDesktop && <BrandLogo compact dark={isDarkMode} />}

          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ flexShrink: 0, display: { xs: 'none', md: 'flex' }, minWidth: 0 }}
          >
            <Box
              sx={{
                width: 3,
                height: 32,
                borderRadius: 1,
                background: `linear-gradient(180deg, ${blue.accentLight}, ${blue.accent})`,
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={appBarPageEyebrowSx(mode)}>{currentSection}</Typography>
              <Typography noWrap sx={appBarPageTitleSx(mode)}>
                {currentTitle}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={appBarSearchSx(mode)}>
            <Search
              sx={{
                fontSize: 18,
                color: isDarkMode ? blue.textMuted : blue.royal,
                mr: 1,
                opacity: 0.85,
              }}
            />
            <InputBase
              placeholder="Search assets, findings..."
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                flexGrow: 1,
                color: isDarkMode ? blue.textPrimary : blue.navyMid,
                '& input': { py: 0.25 },
                '& input::placeholder': {
                  color: isDarkMode ? blue.textMuted : 'rgba(26,68,128,0.55)',
                  opacity: 1,
                },
              }}
            />
          </Box>

          <Box sx={{ flexGrow: { xs: 1, md: 0 }, display: { xs: 'block', md: 'none' } }} />

          <Stack direction="row" spacing={0.75} alignItems="center">
            <ThemeToggle mode={mode} onToggle={toggleMode} compact />

            <Tooltip title="Refresh">
              <IconButton sx={appBarIconButtonSx(mode)}>
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton sx={appBarIconButtonSx(mode)}>
                <Badge
                  badgeContent={notifications}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.625rem',
                      minWidth: 16,
                      height: 16,
                      fontWeight: 700,
                    },
                  }}
                >
                  <Notifications sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Chip
              size="small"
              label={edition.charAt(0).toUpperCase() + edition.slice(1)}
              sx={appBarEditionChipSx(mode, edition === 'enterprise')}
            />

            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                p: 0.25,
                ml: 0.25,
                '&:hover .MuiAvatar-root': {
                  boxShadow: `0 0 0 2px ${blue.accent}55`,
                },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  background: `linear-gradient(135deg, ${blue.accent} 0%, ${blue.royal} 100%)`,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  border: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)'}`,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                }}
              >
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
            </IconButton>
          </Stack>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <Person sx={{ fontSize: 18, mr: 1.5 }} /> Profile
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <Settings sx={{ fontSize: 18, mr: 1.5 }} /> Account Settings
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
                navigate('/login');
              }}
            >
              <Logout sx={{ fontSize: 18, mr: 1.5 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: isDesktop ? 'none' : 'block',
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            ...sidebarPaperSx,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: isDesktop ? 'block' : 'none',
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            ...sidebarPaperSx,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: 7.5, lg: 7.5 },
          minHeight: '100vh',
          minWidth: 0,
          overflowX: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ minWidth: 0 }}
        >
          <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto', width: '100%', minWidth: 0 }}>
            <Outlet />
          </Box>
        </motion.div>
      </Box>
      <RivicQAssistant />
    </Box>
  );
};

export default Layout;
