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
  Logout,
  Person,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getEditionConfig, isPaidEdition } from '../config/editions';
import { MODULES } from '../config/modules';
import { useThemeMode } from '../theme/ThemeContext';
import ThemeToggle from '../theme/ThemeToggle';
import BrandLogo from '../components/BrandLogo';

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
  section?: string;
  disabled?: boolean;
}

const DRAWER_WIDTH = 268;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, edition, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [notifications] = React.useState(5);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [modulesOpen, setModulesOpen] = React.useState(false);
  const editionConfig = getEditionConfig();
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

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.path);
    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.5, px: 1.5 }}>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          selected={active}
          disabled={item.disabled}
          sx={{
            borderRadius: 2,
            py: 0.9,
            minHeight: 40,
            color: item.disabled ? 'text.disabled' : active ? 'primary.main' : 'text.secondary',
            opacity: item.disabled ? 0.55 : 1,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: '#ffffff',
              '&:hover': { bgcolor: 'primary.dark' },
              boxShadow: `0 4px 12px ${theme.palette.primary.main}3d`,
            },
            '&:hover:not(.Mui-selected)': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
            {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
          />
          {item.disabled && (
            <Tooltip title="Paid edition feature — upgrade to enable">
              <Lock sx={{ fontSize: 14, color: 'text.disabled' }} />
            </Tooltip>
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.25, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BrandLogo compact />
      </Box>

      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1.5 }}>
        <List sx={{ px: 0 }}>
          <Typography variant="caption" sx={{ px: 3, py: 0.5, display: 'block', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
            Workspace
          </Typography>
          {navigationItems.map(renderNavItem)}
        </List>

        <Divider sx={{ my: 1 }} />

        <List sx={{ px: 0 }}>
          <Typography variant="caption" sx={{ px: 3, py: 0.5, display: 'block', color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
            Enterprise
          </Typography>
          {enterpriseNav.map(renderNavItem)}
        </List>

        <Divider sx={{ my: 1 }} />

        <List sx={{ px: 0 }}>
          <ListItem disablePadding sx={{ px: 1.5 }}>
            <ListItemButton
              onClick={() => setModulesOpen((v) => !v)}
              disabled={!isPaidEdition(edition)}
              sx={{ borderRadius: 2, py: 0.9, minHeight: 40, color: 'text.secondary' }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <Category />
              </ListItemIcon>
              <ListItemText primary="Security Modules" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
              {isPaidEdition(edition) ? (
                modulesOpen ? <ExpandMore sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />
              ) : (
                <Tooltip title="Paid edition feature — upgrade to enable">
                  <Lock sx={{ fontSize: 14, color: 'text.disabled' }} />
                </Tooltip>
              )}
            </ListItemButton>
          </ListItem>
          <Collapse in={modulesOpen} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ pl: 2 }}>
              {modulesNav.map(renderNavItem)}
            </List>
          </Collapse>
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Chip
            icon={<Psychology sx={{ fontSize: 16 }} />}
            label="Quantum Ready"
            size="small"
            color="secondary"
            sx={{ width: '100%', justifyContent: 'flex-start', fontWeight: 600 }}
          />
          {!isPaidEdition(edition) && (
            <Chip
              icon={<WorkspacePremium sx={{ fontSize: 16 }} />}
              label="Upgrade to unlock modules"
              size="small"
              variant="outlined"
              onClick={() => navigate('/switcher')}
              sx={{ width: '100%', justifyContent: 'flex-start', fontWeight: 600, cursor: 'pointer' }}
            />
          )}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(10px)',
        })}
      >
        <Toolbar sx={{ minHeight: 64, gap: 1 }}>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 0.5 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            <BrandLogo compact />
            <Typography
              variant="subtitle2"
              sx={{ display: { xs: 'none', md: 'block' }, color: 'text.secondary', fontWeight: 500 }}
            >
              {currentTitle}
            </Typography>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              px: 1.5,
              py: 0.75,
              width: { md: 260, lg: 320 },
            }}
          >
            <Search sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} />
            <InputBase
              placeholder="Search modules, assets, findings..."
              sx={{ fontSize: 13.5, flexGrow: 1, '& input': { py: 0 } }}
            />
          </Box>

          <ThemeToggle mode={mode} onToggle={toggleMode} />

          <Tooltip title="Refresh">
            <IconButton color="inherit">
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={notifications} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Chip
            size="small"
            label={edition.toUpperCase()}
            color={edition === 'enterprise' ? 'tertiary' : 'primary'}
            sx={{ fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}
          />

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.25 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}>
              {user?.name?.charAt(0) || 'A'}
            </Avatar>
          </IconButton>
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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 'none' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ px: { xs: 2, md: 3.5 }, py: 3, maxWidth: 1440, mx: 'auto' }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip size="small" label={user?.email || 'unknown-user'} variant="outlined" />
              <Chip size="small" label={editionConfig.name} color="default" />
              {!isPaidEdition(edition) && (
                <Chip
                  size="small"
                  icon={<WorkspacePremium sx={{ fontSize: 14 }} />}
                  label="Upgrade to unlock modules"
                  variant="outlined"
                  onClick={() => navigate('/switcher')}
                  sx={{ cursor: 'pointer' }}
                />
              )}
            </Stack>
            <Outlet />
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Layout;
