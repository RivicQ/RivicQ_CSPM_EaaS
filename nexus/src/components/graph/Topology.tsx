import React from 'react';
import { topology } from '../../data/graph';

const Topology: React.FC<{ selected?: string; onSelect?: (id: string) => void }> = ({ selected, onSelect }) => (
  <ol className="topology" aria-label="Cloud resource topology">
    {topology.map((n, i) => (
      <li key={n.id}>
        <button
          type="button"
          className={`topo-node ${selected === n.id ? 'is-active' : ''} ${n.kind === 'threat' ? 'is-threat' : ''}`}
          onClick={() => onSelect?.(n.id)}
        >
          <span className="mono">{n.label}</span>
          <small>{n.note}</small>
        </button>
        {i < topology.length - 1 && <div className="topo-edge" aria-hidden="true" />}
      </li>
    ))}
  </ol>
);

export default Topology;
