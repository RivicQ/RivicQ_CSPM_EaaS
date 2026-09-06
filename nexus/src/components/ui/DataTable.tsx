import React, { useMemo, useState } from 'react';

export type Column<T> = {
  id: string;
  header: string;
  get: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
  mono?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption?: string;
  onOpen?: (row: T) => void;
  exportName?: string;
};

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function DataTable<T>({ rows, columns, rowKey, caption, onOpen, exportName = 'nexus-export' }: Props<T>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<string>(columns[0]?.id || '');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [selected, setSelected] = useState<string[]>([]);
  const pageSize = 8;

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const next = rows.filter((row) => columns.some((col) => String(col.get(row)).toLowerCase().includes(term)));
    next.sort((a, b) => {
      const col = columns.find((c) => c.id === sort);
      if (!col) return 0;
      const av = col.get(a);
      const bv = col.get(b);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return next;
  }, [rows, columns, q, sort, dir]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (id: string) => {
    if (sort === id) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(id);
      setDir('asc');
    }
  };

  const exportCsv = () => {
    const header = columns.map((c) => csvEscape(c.header)).join(',');
    const body = filtered.map((row) => columns.map((c) => csvEscape(String(c.get(row)))).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="table-toolbar">
        <label>
          <span className="visually-hidden">Search table</span>
          <input className="btn" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search" />
        </label>
        <button type="button" className="btn" onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}>
          Density: {density}
        </button>
        <button type="button" className="btn" onClick={exportCsv}>Export CSV</button>
        <span className="mono" style={{ color: 'var(--faint)' }}>{filtered.length} rows · {selected.length} selected</span>
      </div>
      <div className={`table-wrap ${density}`}>
        <table className="data">
          {caption && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              <th scope="col">
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  checked={slice.length > 0 && slice.every((r) => selected.includes(rowKey(r)))}
                  onChange={(e) => {
                    const keys = slice.map(rowKey);
                    setSelected((cur) => (e.target.checked ? Array.from(new Set([...cur, ...keys])) : cur.filter((k) => !keys.includes(k))));
                  }}
                />
              </th>
              {columns.map((col) => (
                <th key={col.id} scope="col">
                  <button type="button" className="th-btn" onClick={() => toggleSort(col.id)}>
                    {col.header}{sort === col.id ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
              {onOpen && <th scope="col">Open</th>}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => {
              const key = rowKey(row);
              return (
                <tr key={key} className={selected.includes(key) ? 'is-selected' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${key}`}
                      checked={selected.includes(key)}
                      onChange={(e) => setSelected((cur) => (e.target.checked ? [...cur, key] : cur.filter((k) => k !== key)))}
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col.id} className={col.mono ? 'mono' : undefined}>
                      {col.render ? col.render(row) : col.get(row)}
                    </td>
                  ))}
                  {onOpen && (
                    <td>
                      <button type="button" className="btn" onClick={() => onOpen(row)}>Open</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="table-toolbar">
        <button type="button" className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span className="mono">Page {page + 1} / {pages}</span>
        <button type="button" className="btn" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

export default DataTable;
