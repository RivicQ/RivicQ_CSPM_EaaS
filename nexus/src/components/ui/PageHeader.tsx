import React from 'react';

const PageHeader: React.FC<{ title: string; lede: string; children?: React.ReactNode }> = ({ title, lede, children }) => (
  <header className="page-head">
    <div>
      <h1 className="h1">{title}</h1>
      <p className="lede">{lede}</p>
    </div>
    {children}
  </header>
);

export default PageHeader;
