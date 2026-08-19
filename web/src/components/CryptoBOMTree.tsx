import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
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
  type: 'asset' | 'library' | 'algorithm' | 'key';
  algorithm?: string;
  keySize?: number;
  quantumSafe?: boolean;
  children?: CryptoBOMNode[];
}

interface CryptoBOMTreeProps {
  root: CryptoBOMNode;
  depth?: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  asset: <AccountTree fontSize="small" style={{ color: '#0284c7' }} />,
  library: <Lock fontSize="small" style={{ color: '#0284c7' }} />,
  algorithm: <Lock fontSize="small" style={{ color: '#ff832b' }} />,
  key: <Lock fontSize="small" style={{ color: '#24a148' }} />,
};

const CryptoBOMTree: React.FC<CryptoBOMTreeProps> = ({ root, depth = 0 }) => {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = root.children && root.children.length > 0;

  return (
    <Box style={{ marginLeft: depth * 16 }}>
      <ListItem
        disableGutters
        dense
        style={{ paddingLeft: 0, cursor: hasChildren ? 'pointer' : 'default' }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        <ListItemIcon style={{ minWidth: 28 }}>
          {TYPE_ICONS[root.type] || <Lock fontSize="small" />}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="body2" fontWeight={depth === 0 ? 600 : 400}>
                {root.name}
              </Typography>
              {root.algorithm && (
                <Chip
                  size="small"
                  label={root.algorithm}
                  style={{ height: 18, fontSize: '0.6rem', backgroundColor: '#f3f4f6' }}
                />
              )}
              {root.keySize && (
                <Chip
                  size="small"
                  label={`${root.keySize}-bit`}
                  style={{ height: 18, fontSize: '0.6rem', backgroundColor: '#ede9fe' }}
                />
              )}
              {root.quantumSafe !== undefined && (
                root.quantumSafe
                  ? <CheckCircle style={{ fontSize: 14, color: '#24a148' }} />
                  : <Warning style={{ fontSize: 14, color: '#ff832b' }} />
              )}
            </Box>
          }
        />
        {hasChildren && (
          <IconButton size="small">
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        )}
      </ListItem>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding>
            {root.children!.map((child) => (
              <CryptoBOMTree key={child.id} root={child} depth={depth + 1} />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  );
};

export default CryptoBOMTree;
