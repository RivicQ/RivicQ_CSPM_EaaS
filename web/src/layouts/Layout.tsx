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
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Collapse,
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
  ChevronLeft,
  Logout,
  Person,
  AdminPanelSettings,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { isPaidEdition } from '../config/editions';
import { isAdminRole } from '../auth/roles';
import { MODULES } from '../config/modules';
import { useThemeMode } from '../theme/ThemeContext';
import ThemeToggle from '../theme/ThemeToggle';
import BrandLogo from '../components/BrandLogo';
import RivicQAssistant from '../components/assistant/RivicQAssistant';
import DemoEnvironmentBanner from '../components/demo/DemoEnvironmentBanner';
import DemoTrailCoach from '../components/demo/DemoTrailCoach';
import TrademarkNotice from '../components/TrademarkNotice';
import { useDemoTrail } from '../context/DemoTrailContext';
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
const DRAWER_WIDTH_COLLAPSED = 76;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, edition, logout, isDemo } = useAuth();
  const { active: trailActive } = useDemoTrail();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('rivicq.sidebar.collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [notifications] = React.useState(5);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [modulesOpen, setModulesOpen] = React.useState(false);
  const [navQuery, setNavQuery] = React.useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [topSearch, setTopSearch] = React.useState('');
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const desktopWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
  const touchNav = isTablet || isMobile;

  React.useEffect(() => {
    try {
      localStorage.setItem('rivicq.sidebar.collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  // Workspace, reordered by daily operator priority. Settings is pinned to the
  // sidebar footer instead of living in the middle of the list.
  const navigationItems: NavItem[] = [
    { text: 'Command Center', icon: <Dashboard />, path: '/dashboard' },
    { text: isDemo ? 'Demo Trail' : 'Try Demo', icon: <Psychology />, path: '/demo' },
    { text: 'Scanner', icon: <Security />, path: '/scanner' },
    { text: 'Assets', icon: <Storage />, path: '/assets' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'DevSecOps Tools', icon: <Category />, path: '/tools' },
    { text: 'RivicQ Ecosystem', icon: <CloudQueue />, path: '/ecosystem' },
  ];

  const settingsItem: NavItem = { text: 'Settings', icon: <Settings />, path: '/settings' };
  const adminItem: NavItem = { text: 'Admin', icon: <AdminPanelSettings />, path: '/admin' };
  const allWorkspaceItems = [...navigationItems, settingsItem, ...(isAdminRole(user?.role) ? [adminItem] : [])];

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

  const navMatch = (item: NavItem) => item.text.toLowerCase().includes(navQuery.trim().toLowerCase());
  const workspaceSource = navQuery ? allWorkspaceItems : navigationItems;
  const workspaceMatches = navQuery ? workspaceSource.filter(navMatch) : workspaceSource;
  const enterpriseMatches = navQuery ? enterpriseNav.filter(navMatch) : enterpriseNav;

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
    setNavQuery('');
    setMobileSearchOpen(false);
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
    const all = [...allWorkspaceItems, ...enterpriseItems, ...modulesNav];
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
    const button = (
      <ListItemButton
        onClick={() => handleNavigation(item.path)}
        selected={active}
        disabled={item.disabled}
        sx={{
          ...sidebarNavItemButtonSx(active, !!item.disabled),
          justifyContent: sidebarCollapsed && isDesktop ? 'center' : undefined,
          px: sidebarCollapsed && isDesktop ? 1 : undefined,
          minHeight: touchNav ? 44 : undefined,
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: sidebarCollapsed && isDesktop ? 0 : 32, '& svg': { fontSize: 18 } }}>
          {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
        </ListItemIcon>
        {!(sidebarCollapsed && isDesktop) && (
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: '-0.01em' }}
          />
        )}
        {!(sidebarCollapsed && isDesktop) && item.disabled && (
          <Tooltip title="Enterprise feature — upgrade to unlock">
            <Lock sx={{ fontSize: 12, color: 'text.disabled', opacity: 0.6 }} />
          </Tooltip>
        )}
      </ListItemButton>
    );
    return (
      <ListItem key={item.path} disablePadding sx={{ mb: dense ? 0 : 0.125, px: 1.5 }}>
        {sidebarCollapsed && isDesktop ? (
          <Tooltip title={item.text} placement="right">{button}</Tooltip>
        ) : button}
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
          background: designSystem.proBlue.accent,
          borderRadius: '0 4px 4px 0',
        }}
      />
      <Box sx={{ px: sidebarCollapsed && isDesktop ? 1 : 2, py: 1.5, display: 'flex', alignItems: 'center', position: 'relative', flexShrink: 0, justifyContent: 'space-between', gap: 1 }}>
        {!(sidebarCollapsed && isDesktop) && (
          <Box sx={{ minWidth: 0 }}>
            <BrandLogo compact dark />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.35,
                pl: 0.25,
                color: designSystem.proBlue.accentMuted,
                fontWeight: 700,
                letterSpacing: '0.12em',
                fontSize: '0.58rem',
                textTransform: 'uppercase',
              }}
            >
              CSPM · Security Cloud
            </Typography>
          </Box>
        )}
        {isDesktop && (
          <Tooltip title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
            <IconButton
              size="small"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              sx={{ color: designSystem.proBlue.textSecondary, ml: sidebarCollapsed ? 0 : 'auto' }}
            >
              {sidebarCollapsed ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {!(sidebarCollapsed && isDesktop) && (
        <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5, flexShrink: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.6,
              borderRadius: `${designSystem.radius.md}px`,
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: designSystem.motion.smooth,
              '&:focus-within': {
                bgcolor: 'rgba(255,255,255,0.1)',
                borderColor: designSystem.proBlue.accent,
              },
            }}
          >
            <Search sx={{ fontSize: 17, color: designSystem.proBlue.textMuted }} />
            <InputBase
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search navigation…"
              sx={{
                flexGrow: 1,
                fontSize: '0.8125rem',
                color: designSystem.proBlue.textPrimary,
                '& input::placeholder': { color: designSystem.proBlue.textMuted, opacity: 1 },
              }}
            />
            {navQuery && (
              <IconButton size="small" onClick={() => setNavQuery('')} sx={{ color: designSystem.proBlue.textMuted, p: 0.25 }}>
                <ChevronRight sx={{ fontSize: 16, transform: 'rotate(45deg)' }} />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* Single scroll container so every nav item (Workspace, Enterprise,
          and expanded Security Modules) is always reachable on short screens. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          py: 0.75,
          ...sidebarScrollSx,
        }}
      >
        {workspaceMatches.length > 0 && (
          <List sx={{ px: 0, py: 0 }}>
            <Typography variant="caption" sx={{ ...sidebarSectionLabelSx, display: sidebarCollapsed && isDesktop ? 'none' : 'block' }}>
              Workspace
            </Typography>
            {workspaceMatches.map((item) => renderNavItem(item))}
          </List>
        )}

        <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.08)' }} />

        {enterpriseMatches.length > 0 && (
          <List sx={{ px: 0, py: 0 }}>
            <Typography variant="caption" sx={{ ...sidebarSectionLabelSx, display: sidebarCollapsed && isDesktop ? 'none' : 'block' }}>
              Enterprise
            </Typography>
            {enterpriseMatches.map((item) => renderNavItem(item))}
          </List>
        )}

        {navQuery && workspaceMatches.length === 0 && enterpriseMatches.length === 0 && (
          <Typography variant="caption" sx={{ px: 2.5, py: 1, display: 'block', color: designSystem.proBlue.textMuted }}>
            No navigation matches “{navQuery}”.
          </Typography>
        )}

        {!navQuery && (
          <>
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

            {modulesOpen && (
              <List disablePadding sx={{ pl: 1, pr: 0.5, pb: 0.5 }}>
                {modulesNav.map((item) => renderNavItem(item, true))}
              </List>
            )}
          </>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      <List sx={{ px: 0, py: 0.5, flexShrink: 0 }}>
        {isAdminRole(user?.role) && renderNavItem(adminItem)}
        {renderNavItem(settingsItem)}
      </List>

      <Box sx={{ p: 1, position: 'relative', flexShrink: 0, display: sidebarCollapsed && isDesktop ? 'none' : 'block' }}>
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
            icon={<Psychology sx={{ fontSize: 14, color: `${designSystem.proBlue.accentMuted} !important` }} />}
            label="PQC Ready"
            size="small"
            sx={{
              width: '100%',
              justifyContent: 'flex-start',
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: 'rgba(14,165,233,0.2)',
              color: designSystem.proBlue.accentMuted,
              border: 1,
              borderColor: 'rgba(125,211,252,0.28)',
            }}
          />
          <TrademarkNotice
            compact
            sx={{ color: 'rgba(247,245,251,0.45)', px: 0.5 }}
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
          width: { lg: `calc(100% - ${desktopWidth}px)` },
          ml: { lg: `${desktopWidth}px` },
          transition: reduceMotion ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
                background: blue.accent,
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
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="Search posture, scans, findings…"
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                flexGrow: 1,
                color: isDarkMode ? blue.textPrimary : blue.navyMid,
                '& input': { py: 0.25 },
                '& input::placeholder': {
                  color: isDarkMode ? blue.textMuted : 'rgba(14,165,233,0.55)',
                  opacity: 1,
                },
              }}
            />
          </Box>

          <Box sx={{ flexGrow: { xs: 1, md: 0 }, display: { xs: 'block', md: 'none' } }} />

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Tooltip title="Search">
              <IconButton
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label="Search"
                sx={{ ...appBarIconButtonSx(mode), display: { xs: 'inline-flex', md: 'none' } }}
              >
                <Search sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            <ThemeToggle mode={mode} onToggle={toggleMode} compact />

            <Tooltip title="Refresh">
              <IconButton sx={{ ...appBarIconButtonSx(mode), display: { xs: 'none', sm: 'inline-flex' } }}>
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
              sx={{ ...appBarEditionChipSx(mode, edition === 'enterprise'), display: { xs: 'none', sm: 'inline-flex' } }}
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
                  background: blue.accent,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)'}`,
                  boxShadow: 'none',
                }}
              >
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
            </IconButton>
          </Stack>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/settings');
              }}
            >
              <Person sx={{ fontSize: 18, mr: 1.5 }} /> Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/settings');
              }}
            >
              <Settings sx={{ fontSize: 18, mr: 1.5 }} /> Account Settings
            </MenuItem>
            {isAdminRole(user?.role) && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/admin');
                }}
              >
                <AdminPanelSettings sx={{ fontSize: 18, mr: 1.5 }} /> Admin console
              </MenuItem>
            )}
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

        <Collapse in={mobileSearchOpen && !isDesktop} timeout={reduceMotion ? 0 : 220} unmountOnExit>
          <Box sx={{ px: 1.5, pb: 1.25, pt: 0.25 }}>
            <Box sx={{ ...appBarSearchSx(mode), display: 'flex', width: '100%' }}>
              <Search sx={{ fontSize: 18, color: isDarkMode ? blue.textMuted : blue.royal, mr: 1, opacity: 0.85 }} />
              <InputBase
                autoFocus
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                placeholder="Search posture, scans, findings…"
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  flexGrow: 1,
                  color: isDarkMode ? blue.textPrimary : blue.navyMid,
                  '& input::placeholder': { color: isDarkMode ? blue.textMuted : 'rgba(14,165,233,0.55)', opacity: 1 },
                }}
              />
              <IconButton size="small" onClick={() => setMobileSearchOpen(false)} aria-label="Close search">
                <ChevronLeft sx={{ fontSize: 18, color: isDarkMode ? blue.textMuted : blue.royal }} />
              </IconButton>
            </Box>
          </Box>
        </Collapse>
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
          width: desktopWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: desktopWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: reduceMotion ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
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
          width: { lg: `calc(100% - ${desktopWidth}px)` },
          mt: { xs: 7.5, lg: 7.5 },
          pb: { xs: trailActive ? 28 : 8, sm: trailActive ? 22 : 0 },
          minHeight: '100vh',
          minWidth: 0,
          overflowX: 'hidden',
          bgcolor: 'background.default',
          transition: reduceMotion ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiTableContainer-root': { overflowX: 'auto' },
        }}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          style={{ minWidth: 0 }}
        >
          <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto', width: '100%', minWidth: 0 }}>
            <DemoEnvironmentBanner />
            <Outlet />
          </Box>
        </motion.div>
      </Box>
      {isMobile && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
            display: { xs: 'block', sm: 'none' },
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            showLabels
            value={navigationItems.findIndex((it) => isActive(it.path))}
            onChange={(_, idx) => {
              const item = navigationItems[idx];
              if (item) handleNavigation(item.path);
            }}
            sx={{ height: 56 }}
          >
            {navigationItems.slice(0, 4).map((item) => (
              <BottomNavigationAction key={item.path} label={item.text.split(' ')[0]} icon={item.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
      <RivicQAssistant />
      <DemoTrailCoach />
    </Box>
  );
};

export default Layout;
