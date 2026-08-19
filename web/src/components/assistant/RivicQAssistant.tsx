import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close,
  Refresh,
  Send,
  SmartToy,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import RivicQMark from '../brand/RivicQMark';
import { useAuth } from '../../context/AuthContext';
import { useWorkspaceContext } from '../../hooks/useWorkspaceContext';
import { askAssistant, getSuggestedPrompts } from '../../services/aiAssistant';
import type { AssistantMessage } from '../../types/assistant';
import designSystem, { glassSurface } from '../../theme/designSystem';

const FAB_SIZE = 56;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 520;

function renderMarkdownLite(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Box component="span" key={j} sx={{ fontWeight: 700 }}>
            {part.slice(2, -2)}
          </Box>
        );
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return (
          <Box component="span" key={j} sx={{ fontStyle: 'italic', opacity: 0.85 }}>
            {part.slice(1, -1)}
          </Box>
        );
      }
      return part;
    });
    return (
      <Typography key={i} component="div" variant="body2" sx={{ lineHeight: 1.55, mb: line ? 0.35 : 0 }}>
        {parts.length ? parts : '\u00A0'}
      </Typography>
    );
  });
}

const RivicQAssistant: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { edition } = useAuth();
  const { context, scanning, scan, lastError } = useWorkspaceContext(edition);
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const [messages, setMessages] = React.useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I\'m **RivicQ AI**. I scan your inventory, cloud posture, compliance, and security events to answer questions in real time.',
      timestamp: Date.now(),
    },
  ]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking, open]);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  React.useEffect(() => {
    if (context && !scanning) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === 'scan-ready')) return prev;
        return [
          ...prev,
          {
            id: 'scan-ready',
            role: 'system',
            content: `${context.demoMode ? 'Demo dataset loaded' : 'Workspace scanned'} · ${context.inventory?.totalAssets ?? '—'} assets · ${context.cloud?.totalResources ?? '—'} cloud resources`,
            timestamp: Date.now(),
          },
        ];
      });
    }
  }, [context, scanning]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const workspace = context ?? {
        scannedAt: new Date().toISOString(),
        page: window.location.pathname,
        edition,
      };
      const reply = await askAssistant(trimmed, workspace);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry — I couldn\'t process that request. Try refreshing the workspace scan.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'fixed',
              right: isMobile ? 12 : 24,
              bottom: isMobile ? 80 : 96,
              zIndex: 1400,
              width: isMobile ? 'calc(100vw - 24px)' : PANEL_WIDTH,
              maxWidth: PANEL_WIDTH,
              height: isMobile ? 'min(70vh, 520px)' : PANEL_HEIGHT,
            }}
          >
            <Box
              sx={{
                ...glassSurface(theme, true),
                height: '100%',
                borderRadius: `${designSystem.radius.md}px`,
                boxShadow: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(186,230,253,0.16)' : 'rgba(14,165,233,0.16)'}`,
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  background: designSystem.proBlue.commandCenter,
                  color: designSystem.proBlue.textPrimary,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <RivicQMark size={24} variant="dark" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={800} lineHeight={1.2}>
                    RivicQ AI
                  </Typography>
                  <Typography variant="caption" sx={{ color: designSystem.proBlue.textSecondary }}>
                    {scanning ? 'Scanning workspace…' : 'Live posture assistant'}
                  </Typography>
                </Box>
                <Tooltip title="Rescan workspace">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => void scan()}
                      disabled={scanning}
                      sx={{ color: designSystem.proBlue.textPrimary }}
                    >
                      {scanning ? <CircularProgress size={18} color="inherit" /> : <Refresh fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  size="small"
                  onClick={() => setOpen(false)}
                  sx={{ color: designSystem.proBlue.textPrimary }}
                  aria-label="Close assistant"
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>

              <Box
                ref={scrollRef}
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: 1.5,
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                }}
              >
                {messages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '92%',
                    }}
                  >
                    {msg.role === 'system' ? (
                      <Chip
                        size="small"
                        icon={<SmartToy sx={{ fontSize: 14 }} />}
                        label={msg.content}
                        sx={{ height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
                      />
                    ) : (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1.25,
                          borderRadius: msg.role === 'user'
                            ? `${designSystem.radius.lg}px ${designSystem.radius.lg}px 4px ${designSystem.radius.lg}px`
                            : `4px ${designSystem.radius.lg}px ${designSystem.radius.lg}px ${designSystem.radius.lg}px`,
                          bgcolor: msg.role === 'user'
                            ? 'primary.main'
                            : theme.palette.mode === 'dark'
                              ? 'rgba(30,41,59,0.9)'
                              : 'rgba(241,245,249,0.95)',
                          color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                          border: msg.role === 'assistant' ? 1 : 0,
                          borderColor: 'divider',
                        }}
                      >
                        {msg.role === 'user' ? (
                          <Typography variant="body2">{msg.content}</Typography>
                        ) : (
                          renderMarkdownLite(msg.content)
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
                {thinking && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 0.5 }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">
                      Analyzing workspace data…
                    </Typography>
                  </Stack>
                )}
                {lastError && (
                  <Typography variant="caption" color="error.main">
                    {lastError}
                  </Typography>
                )}
              </Box>

              <Box sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
                <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 1, flexWrap: 'nowrap' }}>
                  {getSuggestedPrompts().slice(0, 3).map((prompt) => (
                    <Chip
                      key={prompt}
                      size="small"
                      label={prompt}
                      onClick={() => void sendMessage(prompt)}
                      sx={{ flexShrink: 0, cursor: 'pointer' }}
                    />
                  ))}
                </Stack>
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: `${designSystem.radius.pill}px`,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <InputBase
                    inputRef={inputRef}
                    fullWidth
                    placeholder="Ask about posture, assets, compliance…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={thinking}
                    sx={{ fontSize: '0.875rem' }}
                  />
                  <IconButton
                    type="submit"
                    color="primary"
                    disabled={!input.trim() || thinking}
                    aria-label="Send message"
                  >
                    <Send fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <Tooltip title={open ? 'Close RivicQ AI' : 'Ask RivicQ AI'} placement="left">
        <Box
          component={motion.button}
          onClick={() => setOpen((v) => !v)}
          aria-label="RivicQ AI assistant"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          sx={{
            position: 'fixed',
            right: isMobile ? 16 : 24,
            bottom: isMobile ? 16 : 24,
            zIndex: 1400,
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: '50%',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(186,230,253,0.2)' : 'rgba(14,165,233,0.2)'}`,
            cursor: 'pointer',
            p: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(248,250,252,0.96)' : '#ffffff',
            boxShadow: designSystem.shadow.lg,
            transition: designSystem.motion.smooth,
            '&:hover': {
              boxShadow: designSystem.shadow.md,
            },
          }}
        >
          {open ? (
            <Close sx={{ color: designSystem.proBlue.navy, fontSize: 26 }} />
          ) : (
            <>
              <RivicQMark size={30} variant="light" />
              {scanning && (
                <CircularProgress
                  size={FAB_SIZE + 8}
                  sx={{
                    position: 'absolute',
                    color: 'rgba(14,165,233,0.28)',
                  }}
                />
              )}
            </>
          )}
        </Box>
      </Tooltip>
    </>
  );
};

export default RivicQAssistant;
