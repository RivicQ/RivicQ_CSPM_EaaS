import React from 'react';
import SecurityGraph from './SecurityGraph';

type Props = {
  focusIds?: string[];
  label: string;
  caption?: string;
  hideUnfocused?: boolean;
};

const GraphPanel: React.FC<Props> = ({ focusIds, label, caption, hideUnfocused = true }) => (
  <div className="surface" style={{ padding: 12, marginBottom: 16 }}>
    {caption && (
      <p className="mono" style={{ color: 'var(--faint)', marginBottom: 8 }}>{caption}</p>
    )}
    <SecurityGraph
      focusIds={focusIds}
      hideUnfocused={hideUnfocused && Boolean(focusIds?.length)}
      label={label}
    />
  </div>
);

export default GraphPanel;
