import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

export type OperatorStep = {
  id: string;
  title: string;
  hint: string;
};

export const DEFAULT_OPERATOR_STEPS: OperatorStep[] = [
  { id: 'discover', title: 'Discover', hint: 'Inventory the estate' },
  { id: 'assess', title: 'Assess', hint: 'Score risk and exposure' },
  { id: 'remediate', title: 'Remediate', hint: 'Approve a gated fix' },
  { id: 'report', title: 'Report', hint: 'Export evidence' },
];

type Props = {
  steps?: OperatorStep[];
  active: number;
  onChange?: (index: number) => void;
};

const OperatorRail: React.FC<Props> = ({ steps = DEFAULT_OPERATOR_STEPS, active, onChange }) => {
  const reduce = useReducedMotion();
  return (
    <Box sx={{ width: '100%' }} role="list" aria-label="Operator workflow">
      <Box sx={{ position: 'relative', height: 2, bgcolor: 'divider', mb: -3.25, mx: { xs: 2, md: 6 } }}>
        <motion.div
          style={{ height: '100%', background: '#3b82f6', transformOrigin: 'left' }}
          animate={{ scaleX: steps.length <= 1 ? 1 : active / (steps.length - 1) }}
          transition={reduce ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        {steps.map((step, i) => {
          const isActive = i === active;
          const done = i < active;
          return (
            <Button
              key={step.id}
              role="listitem"
              onClick={() => onChange?.(i)}
              aria-current={isActive ? 'step' : undefined}
              sx={{
                flex: 1,
                justifyContent: 'flex-start',
                textAlign: 'left',
                px: 1.5,
                py: 1.4,
                border: '1px solid',
                borderColor: isActive ? '#3b82f6' : 'divider',
                bgcolor: isActive ? 'rgba(59,130,246,0.12)' : 'background.paper',
                borderRadius: 1,
              }}
            >
              <Box
                component={motion.span}
                animate={isActive && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: isActive && !reduce ? Infinity : 0 }}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  mr: 1.25,
                  bgcolor: done ? '#10b981' : isActive ? '#3b82f6' : '#3f3f46',
                  flexShrink: 0,
                }}
              />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>{step.title}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{step.hint}</Typography>
              </Box>
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
};

export default OperatorRail;
