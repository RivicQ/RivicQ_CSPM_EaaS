import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Warning } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Page error (${this.props.name || 'unknown'}):`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            p: 4,
            gap: 2,
          }}
        >
          <Warning sx={{ fontSize: 48, color: 'warning.main' }} />
          <Typography variant="h6" fontWeight={600}>
            {this.props.name || 'This section'} encountered an error
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </Typography>
          <Button variant="contained" onClick={this.handleReset} size="small">
            Retry
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export const withPageBoundary = (Component: React.ComponentType<any>, name?: string) => {
  return (props: any) => (
    <PageErrorBoundary name={name}>
      <Component {...props} />
    </PageErrorBoundary>
  );
};
