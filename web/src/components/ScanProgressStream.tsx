import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';

export interface ScanProgressEvent {
  type: 'start' | 'progress' | 'finding' | 'complete' | 'error';
  message: string;
  percent?: number;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

interface ScanProgressStreamProps {
  scanId?: string;
  onComplete?: (events: ScanProgressEvent[]) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: '#667eea',
  warning: '#f59e0b',
  error: '#ef4444',
  success: '#10b981',
};

const ScanProgressStream: React.FC<ScanProgressStreamProps> = ({
  scanId,
  onComplete,
}) => {
  const [events, setEvents] = useState<ScanProgressEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const esRef = useRef<EventSource | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!scanId) return;

    setEvents([]);
    setProgress(0);
    setStatus('running');

    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
    const es = new EventSource(`${apiBase}/scan/${scanId}/stream`);
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const event: ScanProgressEvent = JSON.parse(ev.data);
        setEvents((prev) => [...prev, event]);
        if (event.percent !== undefined) {
          setProgress(event.percent);
        }
        if (event.type === 'complete') {
          setStatus('complete');
          es.close();
          onComplete?.(events);
        } else if (event.type === 'error') {
          setStatus('error');
          es.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setStatus('error');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [scanId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  if (status === 'idle') return null;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="body2" fontWeight={600}>
          Scan Progress
        </Typography>
        <Chip
          size="small"
          label={status.toUpperCase()}
          style={{
            backgroundColor:
              status === 'complete' ? '#10b981' :
              status === 'error' ? '#ef4444' : '#667eea',
            color: '#fff',
            fontSize: '0.65rem',
            height: 20,
          }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        style={{ marginBottom: 8, borderRadius: 4 }}
      />
      <List
        ref={listRef}
        dense
        disablePadding
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          background: '#f9fafb',
          borderRadius: 4,
          padding: '4px 8px',
        }}
      >
        {events.map((ev, idx) => (
          <ListItem key={idx} disableGutters style={{ padding: '2px 0' }}>
            <ListItemText
              primary={ev.message}
              primaryTypographyProps={{
                variant: 'caption',
                style: {
                  color: SEVERITY_COLORS[ev.severity || 'info'],
                  fontFamily: 'monospace',
                },
              }}
              secondary={ev.timestamp}
              secondaryTypographyProps={{ variant: 'caption', style: { fontSize: '0.6rem' } }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ScanProgressStream;
