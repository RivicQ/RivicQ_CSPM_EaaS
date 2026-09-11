import React from 'react';

const Badge: React.FC<{ tone?: string; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <span className={`badge ${tone}`}>{children}</span>
);

export default Badge;
