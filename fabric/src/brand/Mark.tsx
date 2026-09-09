import React from 'react';

/** Abstract fabric mark: four nodes, three tension lines. Not a shield or lock. */
const Mark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="4" fill="#111418" stroke="rgba(232,234,237,0.16)" />
    <path d="M8 22 L16 8 L24 22" fill="none" stroke="#8b7ec8" strokeWidth="1.4" />
    <path d="M8 22 L24 22" fill="none" stroke="#c45b9a" strokeWidth="1.2" />
    <circle cx="8" cy="22" r="2.2" fill="#4aa3b8" />
    <circle cx="16" cy="8" r="2.2" fill="#8b7ec8" />
    <circle cx="24" cy="22" r="2.2" fill="#c45b9a" />
    <rect x="14.4" y="14.2" width="3.2" height="3.2" fill="#3d9b74" />
  </svg>
);

export default Mark;
