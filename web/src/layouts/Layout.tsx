import React from 'react';
import { Outlet } from 'react-router-dom';
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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getEditionConfig } from '../config/editions';

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
  section?: string;
  disabled?: boolean;
}

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, edition, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [notifications] = React.useState(5);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const editionConfig = getEditionConfig();

  const navigationItems: NavItem[] = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Assets', icon: <Storage />, path: '/assets' },
    { text: 'Scanner', icon: <Security />, path: '/scanner' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
    { text: 'DevSecOps Tools', icon: <Category />, path: '/tools' },
  ];

  const enterpriseItems: NavItem[] = [
    { text: 'Inventory', icon: <Storage />, path: '/enterprise/inventory', section: 'Enterprise' },
    { text: 'Compliance', icon: <Assessment />, path: '/enterprise/compliance', section: 'Enterprise' },
    { text: 'Quantum', icon: <Psychology />, path: '/enterprise/quantum', section: 'Enterprise' },
    { text: 'Multi-Cloud', icon: <Cloud />, path: '/enterprise/multicloud', section: 'Enterprise' },
    { text: 'CNCF Tools', icon: <CloudQueue />, path: '/enterprise/cncf', section: 'Enterprise' },
    { text: 'Terraform', icon: <GitHub />, path: '/enterprise/terraform', section: 'Enterprise' },
    { text: 'CSPM', icon: <CloudQueue />, path: '/enterprise/cspm', section: 'Enterprise' },
  ];

  const enterpriseNav = enterpriseItems.map((it) => ({ ...it, disabled: edition !== 'enterprise' }));

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const drawer = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security sx={{ color: '#d4af37', fontSize: 32 }} />
        <Typography variant="h6" fontWeight="bold" sx={{ background: 'linear-gradient(45deg, #d4af37 30%, #00c2ff 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CryptoBOM
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 1, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, fontWeight: 600, textTransform: 'uppercase' }}>
          Main Menu
        </Typography>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } },
              }}
            >
              <ListItemIcon sx={{ color: isActive(item.path) ? 'white' : 'inherit', minWidth: 40 }}>
                {item.badge ? <Badge badgeContent={item.badge} color="error">{item.icon}</Badge> : item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />
      
      <List sx={{ px: 1, py: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, fontWeight: 600, textTransform: 'uppercase' }}>
          Enterprise
        </Typography>
        {enterpriseNav.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              disabled={item.disabled}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': { bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' } },
                opacity: item.disabled ? 0.72 : 1,
              }}
            >
              <ListItemIcon sx={{ color: isActive(item.path) ? 'white' : 'inherit', minWidth: 40 }}>
                {item.icon}
                {item.disabled && (
                  <Tooltip title="Enterprise feature — request access to enable">
                    <Box component="span" sx={{ ml: 1, display: 'inline-flex' }}>
                      <Lock sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)' }} />
                    </Box>
                  </Tooltip>
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <Box sx={{ p: 2, mt: 'auto' }}>
        <Stack spacing={1}>
          <Chip
            icon={<Psychology />}
            label="Quantum Ready"
            color="secondary"
            size="small"
            sx={{ width: '100%', justifyContent: 'flex-start' }}
          />
          {edition !== 'enterprise' && (
            <Chip
              icon={<Lock />}
              label="Enterprise locked"
              variant="outlined"
              size="small"
              sx={{ width: '100%', justifyContent: 'flex-start' }}
            />
          )}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'rgba(16,26,45,0.88)', color: 'text.primary', boxShadow: 1, backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(212,175,55,0.18)' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 0, mr: 4 }}>
            <Box component="span" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #d4af37 30%, #00c2ff 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              RivicQ
            </Box>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400, ml: 1 }}>
              CryptoBOM Enterprise
            </Box>
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton>
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <IconButton>
                <Badge badgeContent={notifications} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <Chip
              size="small"
              label={edition.toUpperCase()}
              color={edition === 'enterprise' ? 'secondary' : 'primary'}
              sx={{ mr: 1 }}
            />

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#08111f' }}>{user?.name?.charAt(0) || 'A'}</Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => setAnchorEl(null)}>Profile</MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}>Account Settings</MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { width: 280, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip size="small" label={user?.email || 'unknown-user'} variant="outlined" />
            <Chip size="small" label={editionConfig.name} color="default" />
            {edition !== 'enterprise' && <Chip size="small" icon={<WorkspacePremium />} label="Enterprise features locked" variant="outlined" />}
          </Box>
          <Outlet />
        </motion.div>
      </Box>
    </Box>
  );
};

export default Layout;
