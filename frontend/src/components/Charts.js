import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
   XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

// import {
//   BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
//   ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
//   Legend, ResponsiveContainer, Area, AreaChart, RadarChart,
//   Radar, PolarGrid, PolarAngleAxis
// } from 'recharts';

const COLORS = [
  '#7c6fff', '#22d3ee', '#4ade80', '#fb923c',
  '#c084fc', '#f87171', '#fbbf24', '#60a5fa',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: 'var(--shadow-md)',
      fontSize: '12px',
    }}>
      {label && <p style={{ color: 'var(--text-muted)', marginBottom: '6px', fontSize: '11px' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-primary)', margin: '2px 0' }}>
          <strong>{p.name || p.dataKey}:</strong> {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

function MetricCards({ rows, columns }) {
  const numCols = columns.filter(c =>
    rows.length > 0 && typeof rows[0][c] === 'number'
  );

  if (numCols.length === 0) {
    return (
      <div className="metric-cards">
        {rows.slice(0, 6).map((row, i) => (
          <div key={i} className="metric-card">
            {columns.map(col => (
              <div key={col}>
                <div className="metric-label">{col}</div>
                <div className="metric-value" style={{ fontSize: '16px' }}>{String(row[col])}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="metric-cards">
      {numCols.map(col => {
        const vals = rows.map(r => r[col]).filter(v => typeof v === 'number');
        const total = vals.reduce((a, b) => a + b, 0);
        const avg = vals.length ? (total / vals.length).toFixed(2) : 0;
        return (
          <div key={col} className="metric-card">
            <div className="metric-label">{col}</div>
            <div className="metric-value">{Number(total.toFixed(2)).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              avg: {avg} · n: {vals.length}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Charts({ rows, columns, vizType, vizConfig, title }) {
  const [activeViz, setActiveViz] = useState(vizType || 'bar_chart');

  if (!rows || !rows.length || !columns || !columns.length) return null;

  // Prepare data
  const xKey = vizConfig?.x_key || columns[0];
  const yKey = vizConfig?.y_key || columns.find(c => rows[0] && typeof rows[0][c] === 'number') || columns[1];

  const chartData = rows.slice(0, 50).map(row => {
    const d = {};
    columns.forEach(col => {
      const val = row[col];
      d[col] = typeof val === 'string' && !isNaN(val) ? Number(val) : val;
    });
    return d;
  });

  const numericCols = columns.filter(c => chartData.length > 0 && typeof chartData[0][c] === 'number');

  const vizOptions = [
    { id: 'bar_chart', label: '▊ Bar' },
    { id: 'line_chart', label: '∿ Line' },
    { id: 'area_chart', label: '⌒ Area' },
    { id: 'pie_chart', label: '◔ Pie' },
    { id: 'metric_cards', label: '⧉ Cards' },
    { id: 'table', label: '≡ Raw' },
  ];

  const renderChart = () => {
    if (activeViz === 'metric_cards') return <MetricCards rows={rows} columns={columns} />;

    if (activeViz === 'pie_chart') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={chartData} dataKey={yKey || numericCols[0] || columns[1]} nameKey={xKey}
              cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (activeViz === 'line_chart') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {(numericCols.filter(c => c !== xKey).slice(0, 4)).map((col, i) => (
              <Line key={col} type="monotone" dataKey={col} stroke={COLORS[i]} strokeWidth={2}
                dot={{ r: 3, fill: COLORS[i] }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (activeViz === 'area_chart') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
            <defs>
              {numericCols.slice(0, 4).map((col, i) => (
                <linearGradient key={col} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {numericCols.filter(c => c !== xKey).slice(0, 4).map((col, i) => (
              <Area key={col} type="monotone" dataKey={col} stroke={COLORS[i]} strokeWidth={2}
                fill={`url(#grad${i})`} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar chart
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {numericCols.filter(c => c !== xKey).slice(0, 4).map((col, i) => (
            <Bar key={col} dataKey={col} fill={COLORS[i]} radius={[3, 3, 0, 0]}
              maxBarSize={60} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="chart-container" style={{ animation: 'fadeSlideIn 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="chart-title">
          <span>📊</span>
          <span>{title || vizConfig?.title || 'Visualization'}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {vizOptions.map(opt => (
            <button key={opt.id} className={`view-btn ${activeViz === opt.id ? 'active' : ''}`}
              onClick={() => setActiveViz(opt.id)} style={{ fontSize: '11px', padding: '4px 8px' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {renderChart()}
    </div>
  );
}
