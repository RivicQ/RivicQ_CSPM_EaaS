import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Menu,
  Dashboard,
  Storage,
  Security,
  Analytics,
  Settings,
  Refresh,
  Notifications,
  Visibility,
  CloudUpload,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
}

const DevSecOpsLayout: React.FC<{ children: React.ReactNode; title?: string; subtitle?: string; version?: string }> = ({ 
  children, 
  title = "CryptoBOM SaaS", 
  subtitle = "DevSecOps Platform", 
  version = "v1.3.0" 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [notifications] = React.useState(5);

  const navigationItems: NavItem[] = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      badge: 3,
    },
    {
      text: 'Assets',
      icon: <Storage />,
      path: '/assets',
      badge: 12,
    },
    {
      text: 'Scanner',
      icon: <Security />,
      path: '/scanner',
      badge: 1,
    },
    {
      text: 'Analytics',
      icon: <Analytics />,
      path: '/analytics',
    },
    {
      text: 'Settings',
      icon: <Settings />,
      path: '/settings',
    },
  ];

  const quickActions = [
    {
      text: 'Quick Scan',
      icon: <Refresh />,
      action: () => navigate('/scanner'),
    },
    {
      text: 'Deploy Scanner',
      icon: <CloudUpload />,
      action: () => {
        // Deployment logic would go here
        console.log('Deploy scanner to cluster');
      },
    },
  ];

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            CryptoBOM v1.3.0
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            DevSecOps Platform
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            {navigationItems.map((item) => (
              <motion.div
                key={item.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ListItem
                  button
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(102, 126, 234, 0.12)',
                    borderLeft: '3px solid #667eea',
                    },
                  }}
                >
                  <ListItemIcon>
                    {item.badge ? (
                      <Badge badgeContent={item.badge} color="error" sx={{ backgroundColor: '#f44336' }}>
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              </motion.div>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          {quickActions.map((action, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ListItem
                button
                onClick={action.action}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'linear-gradient(135deg, #5a67d8 0%, #667eea 100%)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {action.icon}
                </ListItemIcon>
                <ListItemText primary={action.text} />
              </ListItem>
            </motion.div>
          ))}
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <AppBar
          position="static"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: 'white' }}
            >
              <Menu />
            </IconButton>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexGrow: 1 }}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ color: 'white', fontWeight: 'bold' }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {subtitle}
                  </Typography>
                )}
                {version && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {version}
                  </Typography>
                )}
              </motion.div>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Notifications">
                <IconButton color="inherit" sx={{ color: 'white' }}>
                  <Badge badgeContent={notifications} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Visibility">
                <IconButton color="inherit" sx={{ color: 'white' }}>
                  <Visibility />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
};

export default DevSecOpsLayout;