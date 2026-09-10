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
  Select,
  FormControl,
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
  AccountTree,
  Api,
  Timeline,
  VpnKey,
  Policy,
  SwapHoriz,
  HelpOutline,
  BugReport,
  MailOutline,
} from '@mui/icons-material';
import BomRibbon from '../components/bom/BomRibbon';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cbomService, inventoryService } from '../services/api';
import { OPS_ROUTES, titleFor } from '../ops/navigation';
import { parseFindingsPayload, scanStatus } from '../ops/findings';
import { loadPersona, persistPersona, PERSONA_LABEL, type OpsPersona } from '../ops/persona';
import CommandPalette from '../components/ops/CommandPalette';
import OpsBreadcrumbs from '../components/ops/OpsBreadcrumbs';
import HelpDrawer from '../components/ops/HelpDrawer';
import StatusChip from '../components/ops/StatusChip';
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
  const { user, edition, logout, isDemo, backendReachable } = useAuth();
  const queryClient = useQueryClient();
  const { active: trailActive } = useDemoTrail();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem('rivicq.sidebar.collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [notificationsAnchor, setNotificationsAnchor] = React.useState<null | HTMLElement>(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [persona, setPersona] = React.useState<OpsPersona>(() => loadPersona());
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [modulesOpen, setModulesOpen] = React.useState(false);
  const [navQuery, setNavQuery] = React.useState('');
  const [timeRange, setTimeRange] = React.useState(() => {
    try {
      return sessionStorage.getItem('rivicq.timeRange') || '24h';
    } catch {
      return '24h';
    }
  });
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

  React.useEffect(() => {
    try {
      sessionStorage.setItem('rivicq.timeRange', timeRange);
    } catch {
      /* ignore */
    }
  }, [timeRange]);

  React.useEffect(() => {
    persistPersona(persona);
    window.dispatchEvent(new CustomEvent('rivicq-persona', { detail: persona }));
  }, [persona]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === '?' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: findingsPayload } = useQuery({
    queryKey: ['ops-findings'],
    queryFn: () => cbomService.getScanFindings().then((r) => r.data).catch(() => null),
    staleTime: 30_000,
  });
  const { data: scansPayload } = useQuery({
    queryKey: ['cbom-scans'],
    queryFn: () => cbomService.listScans().then((r) => r.data).catch(() => null),
    staleTime: 15_000,
  });
  const { data: assetsPayload } = useQuery({
    queryKey: ['ops-assets-index'],
    queryFn: () => inventoryService.getAssets().then((r) => r.data).catch(() => null),
    staleTime: 30_000,
  });

  const opsFindings = React.useMemo(() => parseFindingsPayload(findingsPayload), [findingsPayload]);
  const opsScans = React.useMemo(() => {
    const list = scansPayload?.scans;
    if (!Array.isArray(list)) return [];
    return list.map((s: any) => ({
      id: String(s.id ?? s.scan_id ?? ''),
      target: String(s.target ?? ''),
      status: String(s.status ?? ''),
      error: s.error ? String(s.error) : '',
    })).filter((s: { id: string }) => s.id);
  }, [scansPayload]);
  const opsAssets = React.useMemo(() => {
    const list = Array.isArray(assetsPayload?.assets) ? assetsPayload.assets : Array.isArray(assetsPayload) ? assetsPayload : [];
    return list.slice(0, 40).map((a: any) => ({ id: String(a.id), name: String(a.name || a.id) }));
  }, [assetsPayload]);

  const failedScans = opsScans.filter((s) => scanStatus(s.status) === 'failed');
  const criticalFindings = opsFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const noticeCount = failedScans.length + (criticalFindings.length > 0 ? 1 : 0);

  const ICON_FOR: Record<string, React.ReactElement> = {
    '/dashboard': <Dashboard />,
    '/findings': <BugReport />,
    '/assets': <Storage />,
    '/scanner': <Security />,
    '/bom': <AccountTree />,
    '/migration': <SwapHoriz />,
    '/cspm': <GppGood />,
    '/governance': <Policy />,
    '/security/api': <Api />,
    '/analytics': <Analytics />,
    '/tools': <Category />,
    '/ecosystem': <CloudQueue />,
    '/pipeline': <Timeline />,
    '/connectors/hsm': <VpnKey />,
    '/contact': <MailOutline />,
    '/ibm': <WorkspacePremium />,
    '/crm': <Assessment />,
    '/enterprise/cloud-posture': <GppGood />,
    '/enterprise/compliance': <Assessment />,
    '/enterprise/quantum': <Psychology />,
    '/enterprise/multicloud': <Cloud />,
    '/enterprise/inventory': <Storage />,
    '/enterprise/cspm': <GppGood />,
    '/enterprise/conformance-packs': <FactCheck />,
    '/enterprise/terraform': <GitHub />,
    '/modules': <Category />,
  };

  const paid = isPaidEdition(edition);
  const toNav = (path: string, text: string, section?: string, disabled?: boolean): NavItem => ({
    text,
    icon: ICON_FOR[path] || <Security />,
    path,
    section,
    disabled,
  });

  const operationsItems: NavItem[] = [
    toNav('/dashboard', 'Overview'),
    toNav('/findings', 'Findings'),
    toNav('/assets', 'Assets'),
    toNav('/scanner', 'Scans'),
    toNav('/bom', 'CBOM'),
    toNav('/migration', 'PQC Migration'),
    ...(isDemo ? [toNav('/demo', 'Demo Trail')] : []),
  ];
  const postureItems: NavItem[] = [
    toNav('/cspm', 'Crypto Posture', 'Posture'),
    toNav('/governance', 'Governance', 'Posture'),
    toNav('/security/api', 'API Security', 'Posture'),
    toNav('/analytics', 'Reports', 'Posture'),
  ];
  const integrationItems: NavItem[] = [
    toNav('/tools', 'PATH Scanners', 'Integrations'),
    toNav('/ecosystem', 'Ecosystem', 'Integrations'),
    toNav('/pipeline', 'Pipeline', 'Integrations'),
    toNav('/connectors/hsm', 'HSM & Quantum', 'Integrations'),
    toNav('/contact', 'Contact', 'Integrations'),
    toNav('/ibm', 'IBM Partner Plus', 'Integrations'),
    ...(isAdminRole(user?.role) ? [toNav('/crm', 'CRM', 'Integrations')] : []),
  ];

  const settingsItem: NavItem = { text: 'Settings', icon: <Settings />, path: '/settings' };
  const adminItem: NavItem = { text: 'Admin', icon: <AdminPanelSettings />, path: '/admin' };
  const allWorkspaceItems = [...operationsItems, ...postureItems, ...integrationItems, settingsItem, ...(isAdminRole(user?.role) ? [adminItem] : [])];

  const enterpriseItems: NavItem[] = OPS_ROUTES.filter((r) => r.enterpriseOnly).map((r) =>
    toNav(r.path, r.text, 'Enterprise', !paid),
  );

  const enterpriseNav = enterpriseItems;

  const navMatch = (item: NavItem) => item.text.toLowerCase().includes(navQuery.trim().toLowerCase());
  const workspaceSource = navQuery ? allWorkspaceItems : operationsItems;
  const workspaceMatches = navQuery ? workspaceSource.filter(navMatch) : workspaceSource;
  const postureMatches = navQuery ? postureItems.filter(navMatch) : postureItems;
  const integrationMatches = navQuery ? integrationItems.filter(navMatch) : integrationItems;
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
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'));

  const currentSection = React.useMemo(() => {
    if (postureItems.some((it) => isActive(it.path))) return 'Posture';
    if (integrationItems.some((it) => isActive(it.path))) return 'Integrations';
    if (enterpriseItems.some((it) => isActive(it.path))) return 'Enterprise';
    if (location.pathname.startsWith('/modules')) return 'Security Modules';
    return 'Operations';
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
    return active?.text ?? titleFor(location.pathname);
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
              Security Cloud · SaaS
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
              Operations
            </Typography>
            {workspaceMatches.map((item) => renderNavItem(item))}
          </List>
        )}

        {postureMatches.length > 0 && (
          <List sx={{ px: 0, py: 0 }}>
            <Typography variant="caption" sx={{ ...sidebarSectionLabelSx, display: sidebarCollapsed && isDesktop ? 'none' : 'block' }}>
              Posture
            </Typography>
            {postureMatches.map((item) => renderNavItem(item))}
          </List>
        )}

        {integrationMatches.length > 0 && (
          <List sx={{ px: 0, py: 0 }}>
            <Typography variant="caption" sx={{ ...sidebarSectionLabelSx, display: sidebarCollapsed && isDesktop ? 'none' : 'block' }}>
              Integrations
            </Typography>
            {integrationMatches.map((item) => renderNavItem(item))}
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

        {navQuery && workspaceMatches.length === 0 && postureMatches.length === 0 && integrationMatches.length === 0 && enterpriseMatches.length === 0 && (
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
          <Box sx={{ px: 0.5 }}>
            <StatusChip status={backendReachable ? 'healthy' : isDemo ? 'warning' : 'disconnected'} />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(247,245,251,0.45)' }}>
              {backendReachable ? 'API reachable' : isDemo ? 'Demo session · no live estate' : 'API disconnected'}
            </Typography>
          </Box>
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
            <Box sx={{ display: { xs: 'none', xl: 'block' } }}>
              <BomRibbon compact />
            </Box>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Box
            sx={{ ...appBarSearchSx(mode), cursor: 'pointer' }}
            onClick={() => setPaletteOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPaletteOpen(true); }}
            role="button"
            tabIndex={0}
            aria-label="Open workspace search"
          >
            <Search
              sx={{
                fontSize: 18,
                color: isDarkMode ? blue.textMuted : blue.royal,
                mr: 1,
                opacity: 0.85,
              }}
            />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, flexGrow: 1, color: isDarkMode ? blue.textMuted : '#71717a' }}>
              Search findings, assets, scans…
            </Typography>
            <Typography component="kbd" sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'JetBrains Mono, monospace' }}>
              ⌘K
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 118, display: { xs: 'none', md: 'inline-flex' } }}>
            <Select
              value={persona}
              onChange={(e) => setPersona(e.target.value as OpsPersona)}
              aria-label="Operator view"
              sx={{ height: 36, fontSize: '0.75rem', fontWeight: 600 }}
            >
              <MenuItem value="ciso">{PERSONA_LABEL.ciso}</MenuItem>
              <MenuItem value="analyst">{PERSONA_LABEL.analyst}</MenuItem>
              <MenuItem value="engineer">{PERSONA_LABEL.engineer}</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 132, display: { xs: 'none', md: 'inline-flex' } }}>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(String(e.target.value))}
              aria-label="Time range"
              sx={{ height: 36, fontSize: '0.75rem', fontWeight: 600 }}
            >
              <MenuItem value="24h">Last 24 hours</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 128, display: { xs: 'none', lg: 'inline-flex' } }}>
            <Select
              value={edition}
              onChange={() => navigate('/switcher')}
              aria-label="Workspace"
              sx={{ height: 36, fontSize: '0.75rem', fontWeight: 600 }}
            >
              <MenuItem value="community">Community</MenuItem>
              <MenuItem value="professional">Professional</MenuItem>
              <MenuItem value="enterprise">Enterprise</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: { xs: 1, md: 0 }, display: { xs: 'block', md: 'none' } }} />

          <Stack direction="row" spacing={0.75} alignItems="center">
            <Tooltip title="Search">
              <IconButton
                onClick={() => setPaletteOpen(true)}
                aria-label="Search workspace"
                sx={{ ...appBarIconButtonSx(mode), display: { xs: 'inline-flex', md: 'none' } }}
              >
                <Search sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            <ThemeToggle mode={mode} onToggle={toggleMode} compact />

            <Tooltip title="Refresh workspace data">
              <IconButton
                aria-label="Refresh"
                onClick={() => queryClient.invalidateQueries()}
                sx={{ ...appBarIconButtonSx(mode), display: { xs: 'none', sm: 'inline-flex' } }}
              >
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Help">
              <IconButton aria-label="Open help" onClick={() => setHelpOpen(true)} sx={appBarIconButtonSx(mode)}>
                <HelpOutline sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton
                aria-label={noticeCount ? `${noticeCount} notifications` : 'No notifications'}
                onClick={(e) => setNotificationsAnchor(e.currentTarget)}
                sx={appBarIconButtonSx(mode)}
              >
                <Badge
                  badgeContent={noticeCount}
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
          <Menu
            anchorEl={notificationsAnchor}
            open={Boolean(notificationsAnchor)}
            onClose={() => setNotificationsAnchor(null)}
            MenuListProps={{ 'aria-label': 'Notifications' }}
          >
            {failedScans.length === 0 && criticalFindings.length === 0 && (
              <MenuItem disabled>No scan failures or critical findings in this workspace.</MenuItem>
            )}
            {failedScans.slice(0, 5).map((s) => (
              <MenuItem
                key={s.id}
                onClick={() => {
                  setNotificationsAnchor(null);
                  navigate(`/scanner?scan=${encodeURIComponent(s.id)}`);
                }}
              >
                Scan failed · {s.target || s.id}
              </MenuItem>
            ))}
            {criticalFindings.length > 0 && (
              <MenuItem
                onClick={() => {
                  setNotificationsAnchor(null);
                  navigate('/findings?severity=critical');
                }}
              >
                {criticalFindings.length} critical/high findings
              </MenuItem>
            )}
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
          bgcolor: 'transparent',
          background: mode === 'dark' ? designSystem.gradient.meshDark : designSystem.gradient.meshLight,
          transition: reduceMotion ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiTableContainer-root': { overflowX: 'auto' },
        }}
      >
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={{ minWidth: 0 }}
        >
          <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto', width: '100%', minWidth: 0 }}>
            <DemoEnvironmentBanner />
            <OpsBreadcrumbs />
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
            value={Math.max(0, [operationsItems[0], operationsItems[1], operationsItems[3], operationsItems[2]].findIndex((it) => isActive(it.path)))}
            onChange={(_, idx) => {
              const mobileNav = [operationsItems[0], operationsItems[1], operationsItems[3], operationsItems[2]];
              const item = mobileNav[idx];
              if (item) handleNavigation(item.path);
            }}
            sx={{ height: 56 }}
          >
            {[operationsItems[0], operationsItems[1], operationsItems[3], operationsItems[2]].map((item) => (
              <BottomNavigationAction key={item.path} label={item.text.split(' ')[0]} icon={item.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
      <RivicQAssistant />
      <DemoTrailCoach />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        findings={opsFindings}
        scans={opsScans}
        assets={opsAssets}
        paid={paid}
      />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Box>
  );
};

export default Layout;
