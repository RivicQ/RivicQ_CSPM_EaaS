import React from 'react';

type Tab = { id: string; label: string };

const Tabs: React.FC<{ tabs: Tab[]; value: string; onChange: (id: string) => void }> = ({ tabs, value, onChange }) => (
  <div className="tabs" role="tablist">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={value === t.id}
        className={`btn ${value === t.id ? 'primary' : ''}`}
        onClick={() => onChange(t.id)}
      >
        {t.label}
      </button>
    ))}
  </div>
);

export default Tabs;
