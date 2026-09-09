import React from 'react';
import { edges, nodes, type GNode, type NodeKind } from '../../data/graph';

const colors: Record<NodeKind, string> = {
  cloud: '#9aa3ad',
  identity: '#4aa3b8',
  application: '#8b7ec8',
  database: '#3d9b74',
  certificate: '#d4a04a',
  key: '#c45b9a',
  secret: '#d46565',
  ai: '#8b7ec8',
  threat: '#d46565',
  hardware: '#9aa3ad',
  user: '#4aa3b8',
  container: '#6d7680',
  kube: '#6d7680',
};

const shape = (n: GNode, dim: boolean) => {
  const c = dim ? 'rgba(154,163,173,0.28)' : colors[n.kind];
  const pulse = dim ? '' : n.risk === 'critical' ? 'pulse-threat' : n.risk === 'quantum' ? 'pulse-quantum' : '';
  if (n.kind === 'identity' || n.kind === 'user' || n.kind === 'ai') {
    return <circle className={pulse} cx={n.x} cy={n.y} r={14} fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  if (n.kind === 'certificate') {
    return <polygon className={pulse} points={`${n.x},${n.y - 16} ${n.x + 14},${n.y} ${n.x},${n.y + 16} ${n.x - 14},${n.y}`} fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  if (n.kind === 'database') {
    return <ellipse className={pulse} cx={n.x} cy={n.y} rx="16" ry="12" fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  if (n.kind === 'key') {
    return <rect className={pulse} x={n.x - 8} y={n.y - 8} width="16" height="16" fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  if (n.kind === 'hardware') {
    return <rect className={pulse} x={n.x - 18} y={n.y - 10} width="36" height="20" fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  if (n.kind === 'application') {
    return <polygon className={pulse} points={`${n.x - 14},${n.y - 10} ${n.x + 14},${n.y - 10} ${n.x + 18},${n.y + 12} ${n.x - 18},${n.y + 12}`} fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  if (n.kind === 'secret') {
    return <path className={pulse} d={`M ${n.x} ${n.y - 14} q 14 6 14 16 q 0 10 -14 14 q -14 -4 -14 -14 q 0 -10 14 -16`} fill="#161a20" stroke={c} strokeWidth="1.6" />;
  }
  return <rect className={pulse} x={n.x - 16} y={n.y - 12} width="32" height="24" rx="6" fill="#161a20" stroke={c} strokeWidth="1.6" />;
};

type Props = {
  onSelect?: (id: string) => void;
  selected?: string;
  /** When set, only these nodes (and edges between them) are in focus. */
  focusIds?: string[];
  hideUnfocused?: boolean;
  label?: string;
};

const SecurityGraph: React.FC<Props> = ({ onSelect, selected, focusIds, hideUnfocused, label }) => {
  const focus = focusIds && focusIds.length ? new Set(focusIds) : null;
  const shownNodes = hideUnfocused && focus
    ? nodes.filter((n) => focus.has(n.id))
    : nodes;
  const shownIds = new Set(shownNodes.map((n) => n.id));
  return (
    <svg viewBox="0 0 780 330" role="img" aria-label={label || 'Enterprise security graph for the labeled Northbridge demo'}>
      {edges.map((e) => {
        const a = nodes.find((n) => n.id === e.from);
        const b = nodes.find((n) => n.id === e.to);
        if (!a || !b) return null;
        if (!shownIds.has(a.id) || !shownIds.has(b.id)) return null;
        const focused = !focus || (focus.has(e.from) && focus.has(e.to));
        if (hideUnfocused && !focused) return null;
        const attack = e.kind === 'attack';
        const crypto = e.kind === 'crypto';
        return (
          <line
            key={`${e.from}-${e.to}-${e.kind}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={
              !focused
                ? 'rgba(232,234,237,0.06)'
                : attack
                  ? '#d46565'
                  : crypto
                    ? '#c45b9a'
                    : 'rgba(232,234,237,0.16)'
            }
            strokeWidth={focused && (attack || crypto) ? 1.6 : 1}
          />
        );
      })}
      {shownNodes.map((n) => {
        const dim = Boolean(focus && !focus.has(n.id));
        return (
          <g
            key={n.id}
            className="node"
            tabIndex={dim ? -1 : 0}
            role="button"
            aria-pressed={selected === n.id}
            opacity={dim ? 0.22 : 1}
            onClick={() => !dim && onSelect?.(n.id)}
            onKeyDown={(ev) => {
              if (dim) return;
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                onSelect?.(n.id);
              }
            }}
          >
            {shape(n, dim)}
            <text x={n.x} y={n.y + 28} textAnchor="middle" fill={dim ? '#6d7680' : '#9aa3ad'} fontSize="10" fontFamily="Inter, sans-serif">
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default SecurityGraph;
