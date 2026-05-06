import React, { useState } from 'react';

function cellClass(value, col) {
  if (value === null || value === undefined || value === '') return 'null-val';
  if (String(value) === '***REDACTED***') return 'redacted';
  if (typeof value === 'number') return 'number-val';
  return '';
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (String(value) === '***REDACTED***') return '🔒 REDACTED';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? '✓ true' : '✗ false';
  return String(value);
}

export default function DataTable({ rows, columns }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');

  if (!rows || rows.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
      No rows returned
    </div>
  );

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  let displayRows = [...rows];

  if (search) {
    const q = search.toLowerCase();
    displayRows = displayRows.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
  }

  if (sortCol) {
    displayRows.sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol];
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  return (
    <div>
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="text"
          placeholder="Filter rows…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            outline: 'none',
            width: '200px',
          }}
        />
        {search && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {displayRows.length} / {rows.length} rows
          </span>
        )}
      </div>
      <div className="data-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col}
                    {sortCol === col && <span style={{ color: 'var(--accent-bright)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col} className={cellClass(row[col], col)} title={formatCell(row[col])}>
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
