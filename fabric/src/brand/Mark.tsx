import React from 'react';

/** Four nodes, three tension lines. Violet nebula mark — not a shield or lock. */
const Mark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="4" fill="#0a0a0f" stroke="#1f1f2e" />
    <path d="M8 22 L16 8 L24 22" fill="none" stroke="#7c3aed" strokeWidth="1.4" />
    <path d="M8 22 L24 22" fill="none" stroke="#a78bfa" strokeWidth="1.2" />
    <circle cx="8" cy="22" r="2.2" fill="#7c3aed" />
    <circle cx="16" cy="8" r="2.2" fill="#a78bfa" />
    <circle cx="24" cy="22" r="2.2" fill="#6d28d9" />
    <rect x="14.4" y="14.2" width="3.2" height="3.2" fill="#7c3aed" />
  </svg>
);

export default Mark;
