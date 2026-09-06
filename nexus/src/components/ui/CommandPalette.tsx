import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const destinations = [
  ['Command Center', '/app/command'],
  ['Security graph', '/app/graph'],
  ['Cloud security', '/app/cloud'],
  ['CryptoBOM', '/app/cryptobom'],
  ['PQC readiness', '/app/pqc'],
  ['Certificates', '/app/certs'],
  ['Secrets', '/app/secrets'],
  ['Compliance', '/app/compliance'],
  ['AI analyst', '/app/analyst'],
  ['Automation', '/app/automation'],
  ['SBOM', '/app/sbom'],
  ['HBOM', '/app/hbom'],
  ['IBOM', '/app/ibom'],
  ['AIBOM', '/app/ai'],
  ['Reports', '/app/reports'],
  ['Administration', '/app/admin'],
];

const CommandPalette: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const items = useMemo(
    () => destinations.filter(([label]) => label.toLowerCase().includes(q.toLowerCase())),
    [q],
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="palette" role="dialog" aria-label="Command palette">
        <input
          className="btn"
          autoFocus
          placeholder="Go to module"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul>
          {items.map(([label, to]) => (
            <li key={to}>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  nav(to);
                  onClose();
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default CommandPalette;
