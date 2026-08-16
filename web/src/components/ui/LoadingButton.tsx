import React from 'react';
import { Box, Button, ButtonProps, CircularProgress } from '@mui/material';

export type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
  loadingText?: string;
};

/**
 * Additive enhancement over MUI Button: shows an inline spinner and disables
 * interaction while `loading`. It reuses the app's existing Button styling and
 * variants, so it never replaces the current button look — it only layers a
 * loading state on top (for Scan, Export, Sign in, etc.).
 */
const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  disabled,
  children,
  startIcon,
  ...rest
}) => (
  <Button
    {...rest}
    disabled={disabled || loading}
    startIcon={loading ? undefined : startIcon}
    aria-busy={loading || undefined}
    sx={{ position: 'relative', ...(rest.sx || {}) }}
  >
    {loading && (
      <Box
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}
      >
        <CircularProgress size={16} thickness={5} color="inherit" />
      </Box>
    )}
    {loading ? loadingText || children : children}
  </Button>
);

export default LoadingButton;
