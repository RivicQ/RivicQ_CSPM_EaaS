import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingScreenProps {
  message?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <CircularProgress color="primary" />
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
    </Box>
  )
}

export default LoadingScreen
