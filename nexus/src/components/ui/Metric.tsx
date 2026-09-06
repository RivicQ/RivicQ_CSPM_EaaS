import React from 'react';

const Metric: React.FC<{ label: string; value: string | number; hint?: string }> = ({ label, value, hint }) => (
  <div className="surface metric">
    <small>{label}</small>
    <b>{value}</b>
    {hint && <small>{hint}</small>}
  </div>
);

export default Metric;
