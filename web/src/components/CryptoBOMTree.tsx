import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Lock,
  Warning,
  CheckCircle,
  AccountTree,
} from '@mui/icons-material';

export interface CryptoBOMNode {
  id: string;
  name: string;
  algorithm: string;
  keySize?: number;
  quantum_safe: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  children?: CryptoBOMNode[];
  metadata?: Record<string, string | number | boolean>;
}

interface CryptoBOMNodeProps {
  node: CryptoBOMNode;
  depth?: number;
}

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const CryptoBOMNodeRow: React.FC<CryptoBOMNodeProps> = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const riskColor = RISK_COLORS[node.risk_level];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.75,
          px: 1,
          ml: depth * 2.5,
          borderRadius: 1,
          '&:hover': { backgroundColor: '#f8fafc' },
          cursor: hasChildren ? 'pointer' : 'default',
          borderLeft: depth > 0 ? `2px solid ${riskColor}30` : 'none',
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <IconButton size="small" sx={{ p: 0 }}>
            {expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
          </IconButton>
        ) : (
          <Box sx={{ width: 20 }} />
        )}

        {node.quantum_safe ? (
          <CheckCircle sx={{ fontSize: 16, color: '#10b981' }} />
        ) : (
          <Warning sx={{ fontSize: 16, color: riskColor }} />
        )}

        <Typography variant="body2" fontWeight={depth === 0 ? 700 : 500} sx={{ flexGrow: 1 }}>
          {node.name}
        </Typography>

        <Chip
          label={node.algorithm}
          size="small"
          sx={{ fontSize: '0.65rem', height: 20, fontFamily: 'monospace' }}
          variant="outlined"
        />

        {node.keySize && (
          <Typography variant="caption" color="textSecondary" sx={{ minWidth: 50 }}>
            {node.keySize}b
          </Typography>
        )}

        <Chip
          label={node.risk_level}
          size="small"
          sx={{
            fontSize: '0.65rem',
            height: 20,
            color: riskColor,
            borderColor: `${riskColor}60`,
            backgroundColor: `${riskColor}12`,
            border: '1px solid',
            fontWeight: 700,
          }}
          variant="outlined"
        />
      </Box>

      {hasChildren && (
        <Collapse in={expanded}>
          {node.children!.map((child) => (
            <CryptoBOMNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

interface CryptoBOMTreeProps {
  nodes: CryptoBOMNode[];
  title?: string;
}

export const CryptoBOMTree: React.FC<CryptoBOMTreeProps> = ({ nodes, title = 'Crypto BOM Tree' }) => (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <AccountTree sx={{ color: '#667eea', fontSize: 20 }} />
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
      <Chip label={`${nodes.length} roots`} size="small" variant="outlined" />
    </Box>
    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1 }}>
      {nodes.map((node) => (
        <CryptoBOMNodeRow key={node.id} node={node} depth={0} />
      ))}
    </Box>
  </Box>
);

export default CryptoBOMTree;
