/*
SafeSphere - Analytics Page (Phase 3, Member 2)
==================================================
Shows historical safety analytics: incidents over time, alert type
breakdown, severity breakdown, and a highest-risk-workers table.

DATA SOURCE: GET /api/reports/weekly (built by M3 / Pranav)
This endpoint is JWT-protected, so you must be logged in first.

CONFIRMED REAL RESPONSE SHAPE (tested directly against the live
backend, not guessed):
{
  "success": true,
  "data": {
    "timeframe": "Last 7 Days",
    "totalIncidents": 5,
    "breakdownByType": { "Anomaly": 2, "Heat Stress": 2, "SOS": 1 },
    "breakdownBySeverity": { "High": 4, "Critical": 1 },
    "trend": [{ "date": "2026-06-28", "count": 5 }],
    "highestRiskWorkers": [
      { "workerId": "W-001", "name": "John Doe", "count": 3 }
    ]
  }
}

NOTE ON SCHEMA: M3's backend doesn't have a "zone" concept (that
was part of the original Phase 1 schema design, not what's actually
live). So "risk by zone" from the project plan is approximated here
using severity breakdown + highest-risk-workers instead. If a zone
field gets added later, a per-zone chart can slot in alongside these.

WHERE THIS GOES: frontend/src/pages/AnalyticsPage.jsx

REQUIRES:
  npm install axios recharts
  (run inside your /frontend folder)

AUTH NOTE: This component expects a JWT token to already exist
(e.g. stored after login). For now it reads from a `token` prop.
Replace the placeholder source in App.jsx with however your team
ends up storing the logged-in session (likely the context/ folder
already in the project) once the login flow exists.

DESIGN NOTE: built as a control-room safety instrument, not a
generic dashboard template. Severity red/amber/green is reserved
ONLY for genuine risk signals and never used decoratively elsewhere.
Numerals use a monospace face so figures stay legible and align
cleanly in the table. The previous version's pie chart had its
labels colliding with the legend below it (labels were drawn AT
the default radius with no room reserved) — fixed below by giving
the donut a fixed inner/outer radius with headroom, and replacing
the on-slice label clutter with a clean side-by-side legend list
that also surfaces the exact count per type (more useful at a
glance than a percentage on a 3-slice chart anyway).
*/

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

// Severity colors are the ONLY saturated color in this page — reserved
// strictly for actual risk signals, never used decoratively elsewhere.
const SEVERITY_COLORS = {
  Low: '#5a8f3c',
  Medium: '#b8791f',
  High: '#b3392f',
  Critical: '#7a1f1f'
};

// Alert-type colors are deliberately muted/desaturated — these encode
// category, not danger, so they shouldn't compete visually with severity.
const TYPE_COLORS = ['#3db4bf', '#76ec44', '#ef125c', '#52837c', '#f7e73c'];

/*
TODO: REPLACE WITH REAL AUTH TOKEN SOURCE
Right now this reads a token passed in as a prop. Once the team's
login flow + Context (frontend/src/context/) is wired up, replace
the prop source in App.jsx with something like:
  const { token } = useContext(AuthContext);
*/
async function fetchWeeklyReport(token) {
  const response = await axios.get(`${API_BASE}/reports/weekly`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.data;
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={styles.tooltip}>
      {label && <div style={styles.tooltipLabel}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} style={styles.tooltipRow}>
          <span style={{ ...styles.tooltipDot, backgroundColor: p.color || p.fill }} />
          <span>{p.name}</span>
          <span style={styles.tooltipValue}>{p.value}{unit || ''}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage({ token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!token) {
        setError('No active session. Sign in to view the analytics report.');
        setLoading(false);
        return;
      }
      try {
        const data = await fetchWeeklyReport(token);
        if (isMounted) {
          setReport(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Could not reach the analytics service. Confirm the backend is running and the session is valid.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { isMounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.statusBox}>
          <div style={styles.pulse} />
          <p style={styles.statusText}>Pulling the weekly report…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.statusBox}>
          <p style={{ ...styles.statusText, color: SEVERITY_COLORS.High }}>{error}</p>
        </div>
      </div>
    );
  }

  const typeData = Object.entries(report.breakdownByType).map(([name, value], i) => ({
    name, value, color: TYPE_COLORS[i % TYPE_COLORS.length]
  }));
  const severityOrder = ['Low', 'Medium', 'High', 'Critical'];
  const severityData = severityOrder
    .filter((level) => report.breakdownBySeverity[level] !== undefined)
    .map((level) => ({ name: level, value: report.breakdownBySeverity[level] }));

  const totalTypeCount = typeData.reduce((sum, t) => sum + t.value, 0);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Site safety report</p>
          <h1 style={styles.title}>{report.timeframe}</h1>
        </div>
        <div style={styles.headerStat}>
          <span style={styles.headerStatNumber}>{report.totalIncidents}</span>
          <span style={styles.headerStatLabel}>total incidents</span>
        </div>
      </header>

      {/* Incidents over time */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Incidents over time</h2>
        {report.trend.length === 0 ? (
          <p style={styles.emptyNote}>No incidents recorded in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={report.trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e0d8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b6557' }} axisLine={{ stroke: '#d8d3c7' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b6557' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit=" incidents" />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Incidents"
                stroke="#3d6b8a"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3d6b8a', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <div style={styles.row}>
        {/* Alert type breakdown — donut + side legend, no overlapping labels */}
        <section style={{ ...styles.card, flex: 1, minWidth: '280px' }}>
          <h2 style={styles.cardTitle}>Alert types</h2>
          {typeData.length === 0 ? (
            <p style={styles.emptyNote}>No alerts logged yet.</p>
          ) : (
            <div style={styles.donutRow}>
              <div style={{ width: '140px', height: '140px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {typeData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul style={styles.legendList}>
                {typeData.map((entry) => (
                  <li key={entry.name} style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, backgroundColor: entry.color }} />
                    <span style={styles.legendName}>{entry.name}</span>
                    <span style={styles.legendValue}>{entry.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {typeData.length > 0 && (
            <p style={styles.donutCaption}>{totalTypeCount} alerts across {typeData.length} categories</p>
          )}
        </section>

        {/* Severity breakdown */}
        <section style={{ ...styles.card, flex: 1, minWidth: '280px' }}>
          <h2 style={styles.cardTitle}>Severity breakdown</h2>
          {severityData.length === 0 ? (
            <p style={styles.emptyNote}>No alerts logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={severityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e0d8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b6557' }} axisLine={{ stroke: '#d8d3c7' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b6557' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unit=" alerts" />} />
                <Bar dataKey="value" name="Alerts" radius={[3, 3, 0, 0]} maxBarSize={42}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#999'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* Highest risk workers */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Highest risk workers</h2>
        {report.highestRiskWorkers.length === 0 ? (
          <p style={styles.emptyNote}>No worker risk data yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Worker</th>
                <th style={styles.th}>ID</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {report.highestRiskWorkers.map((worker, i) => (
                <tr key={worker.workerId}>
                  <td style={styles.td}>
                    <span style={styles.rank}>{i + 1}</span>
                    {worker.name}
                  </td>
                  <td style={{ ...styles.td, ...styles.mono, color: '#8a8470' }}>{worker.workerId}</td>
                  <td style={{ ...styles.td, ...styles.mono, textAlign: 'right', fontWeight: 600 }}>
                    {worker.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const FONT_BODY = "'Inter', -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Consolas', monospace";

const styles = {
  page: {
    fontFamily: FONT_BODY,
    maxWidth: '960px',
    margin: '0 auto',
    padding: '1.5rem',
    color: '#2b2820'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottom: '2px solid #2b2820',
    paddingBottom: '14px',
    marginBottom: '20px'
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#8a8470',
    margin: '0 0 4px',
    fontWeight: 600
  },
  title: { fontSize: '24px', fontWeight: 700, margin: 0 },
  headerStat: { textAlign: 'right' },
  headerStatNumber: {
    display: 'block',
    fontFamily: FONT_MONO,
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1
  },
  headerStatLabel: { fontSize: '11px', color: '#8a8470', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statusBox: { padding: '3rem 1rem', textAlign: 'center' },
  statusText: { fontSize: '14px', color: '#6b6557' },
  pulse: {
    width: '10px', height: '10px', borderRadius: '50%',
    backgroundColor: '#3d6b8a', margin: '0 auto 12px',
    animation: 'pulse 1.4s ease-in-out infinite'
  },
  card: {
    border: '1px solid #ddd8cb',
    borderRadius: '6px',
    padding: '18px 20px',
    marginBottom: '16px',
    backgroundColor: '#fdfcf9'
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#52503f',
    margin: '0 0 14px'
  },
  row: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  emptyNote: { fontSize: '13px', color: '#8a8470', fontStyle: 'italic' },
  donutRow: { display: 'flex', alignItems: 'center', gap: '20px' },
  donutCaption: { fontSize: '11px', color: '#8a8470', margin: '12px 0 0', textAlign: 'right' },
  legendList: { listStyle: 'none', margin: 0, padding: 0, flex: 1 },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 0', borderBottom: '1px solid #eeebe2', fontSize: '13px'
  },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  legendName: { flex: 1 },
  legendValue: { fontFamily: FONT_MONO, fontWeight: 600, color: '#52503f' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #2b2820',
    color: '#52503f', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em'
  },
  td: { padding: '10px 8px', borderBottom: '1px solid #eeebe2' },
  mono: { fontFamily: FONT_MONO },
  rank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '18px', height: '18px', borderRadius: '50%',
    backgroundColor: '#eeebe2', fontSize: '10px', fontFamily: FONT_MONO,
    marginRight: '8px', color: '#52503f'
  },
  tooltip: {
    backgroundColor: '#2b2820', color: '#fdfcf9', borderRadius: '4px',
    padding: '8px 10px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  tooltipLabel: { fontWeight: 600, marginBottom: '4px', fontFamily: FONT_MONO },
  tooltipRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  tooltipDot: { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  tooltipValue: { fontFamily: FONT_MONO, marginLeft: 'auto', fontWeight: 600 }
};

export default AnalyticsPage;
