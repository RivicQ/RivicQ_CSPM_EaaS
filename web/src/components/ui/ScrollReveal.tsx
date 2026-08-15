import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

type ScrollRevealProps = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
};

/**
 * Reveals its children with a subtle rise + fade the first time they scroll
 * into view. Framer Motion automatically disables transforms when the user
 * prefers reduced motion via the MotionConfig in the app root.
 */
const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, delay = 0, y = 18, once = true }) => (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once, margin: '-60px' }}
    transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
    sx={{ minWidth: 0 }}
  >
    {children}
  </Box>
);

export default ScrollReveal;
