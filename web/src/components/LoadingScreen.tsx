import React from 'react';
import { Box, Skeleton } from '@mui/material';

export const LoadingScreen: React.FC = () => (
  <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
    <Skeleton variant="text" width={240} height={40} sx={{ mb: 1 }} />
    <Skeleton variant="text" width={400} height={24} sx={{ mb: 3 }} />
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <Skeleton variant="rounded" width="25%" height={140} />
      <Skeleton variant="rounded" width="25%" height={140} />
      <Skeleton variant="rounded" width="25%" height={140} />
      <Skeleton variant="rounded" width="25%" height={140} />
    </Box>
    <Skeleton variant="rounded" width="100%" height={280} sx={{ mb: 2 }} />
    <Skeleton variant="rounded" width="100%" height={200} />
  </Box>
);

export const PageSkeleton: React.FC<{ lines?: number }> = ({ lines = 6 }) => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" width={`${80 - i * 8}%`} height={18} sx={{ mb: 0.5 }} />
    ))}
  </Box>
);
