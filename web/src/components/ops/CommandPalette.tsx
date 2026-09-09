import React from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton, InputBase, List, ListItemButton, ListItemText, Stack, Typography,
} from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { OPS_ROUTES, PALETTE_ACTIONS } from '../../ops/navigation';
import { loadRecentSearches, pushRecentSearch } from '../../ops/findings';
import type { OpsFinding } from '../../ops/findings';

type Hit = { id: string; group: string; label: string; hint?: string; path: string };

function score(q: string, text: string) {
  const n = q.toLowerCase();
  const t = text.toLowerCase();
  if (!n) return 1;
  if (t.startsWith(n)) return 3;
  if (t.includes(n)) return 2;
  return 0;
}

type Props = {
  open: boolean;
  onClose: () => void;
  findings: OpsFinding[];
  scans: Array<{ id: string; target: string; status: string }>;
  assets: Array<{ id: string; name: string }>;
  paid: boolean;
};

const CommandPalette: React.FC<Props> = ({ open, onClose, findings, scans, assets, paid }) => {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [recent, setRecent] = React.useState<string[]>(() => loadRecentSearches());
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const hits = React.useMemo(() => {
    const query = q.trim();
    const out: Hit[] = [];
    PALETTE_ACTIONS.forEach((a) => {
      const blob = `${a.label} ${a.keywords.join(' ')}`;
      if (!query || score(query, blob)) out.push({ id: `act-${a.id}`, group: 'Actions', label: a.label, path: a.path });
    });
    OPS_ROUTES.filter((r) => paid || !r.enterpriseOnly).forEach((r) => {
      const blob = `${r.text} ${r.path} ${r.keywords.join(' ')}`;
      if (!query || score(query, blob)) out.push({ id: `nav-${r.path}`, group: r.section, label: r.text, hint: r.path, path: r.path });
    });
    findings.slice(0, 40).forEach((f) => {
      const blob = `${f.title} ${f.asset} ${f.algorithm || ''} ${f.id}`;
      if (query && score(query, blob)) {
        out.push({ id: `f-${f.id}`, group: 'Findings', label: f.title, hint: f.asset || f.severity, path: `/findings?id=${encodeURIComponent(f.id)}` });
      }
    });
    scans.slice(0, 20).forEach((s) => {
      const blob = `${s.target} ${s.id} ${s.status}`;
      if (query && score(query, blob)) {
        out.push({ id: `s-${s.id}`, group: 'Scans', label: s.target || s.id, hint: s.status, path: `/scanner?scan=${encodeURIComponent(s.id)}` });
      }
    });
    assets.slice(0, 20).forEach((a) => {
      const blob = `${a.name} ${a.id}`;
      if (query && score(query, blob)) {
        out.push({ id: `a-${a.id}`, group: 'Assets', label: a.name, path: `/assets/${encodeURIComponent(a.id)}` });
      }
    });
    return out.slice(0, 40);
  }, [q, findings, scans, assets, paid]);

  const go = (path: string) => {
    if (q.trim()) setRecent(pushRecentSearch(q.trim()));
    onClose();
    navigate(path);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      go(hits[active].path);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-label="Command palette">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.25 }}>
        <Search fontSize="small" />
        <Typography variant="subtitle2" fontWeight={800} sx={{ flexGrow: 1 }}>Search RivicQ</Typography>
        <Typography component="kbd" variant="caption" color="text.secondary">esc</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close search"><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, px: 0 }}>
        <Box sx={{ px: 2, pb: 1 }}>
          <InputBase
            inputRef={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKey}
            placeholder="Findings, assets, scans, pages…"
            fullWidth
            inputProps={{ 'aria-label': 'Search workspace' }}
            sx={{ fontSize: 16, fontWeight: 600 }}
          />
        </Box>
        {!q && recent.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1 }} flexWrap="wrap" useFlexGap>
            {recent.map((r) => (
              <Button key={r} size="small" variant="outlined" onClick={() => setQ(r)}>{r}</Button>
            ))}
          </Stack>
        )}
        <List dense sx={{ maxHeight: 420, overflow: 'auto' }}>
          {hits.map((h, i) => (
            <ListItemButton key={h.id} selected={i === active} onClick={() => go(h.path)}>
              <ListItemText
                primary={h.label}
                secondary={h.hint ? `${h.group} · ${h.hint}` : h.group}
                primaryTypographyProps={{ fontWeight: 700, fontSize: 13 }}
                secondaryTypographyProps={{ fontSize: 11 }}
              />
            </ListItemButton>
          ))}
          {hits.length === 0 && (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No matches in this workspace. Findings and assets appear after a completed scan on a running API. Pages is static.
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
