import React, { useEffect } from 'react';

const Drawer: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="btn-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="h2" style={{ margin: 0 }}>{title}</h2>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
        {children}
      </aside>
    </>
  );
};

export default Drawer;
