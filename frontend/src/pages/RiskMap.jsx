/*
SafeSphere - Risk Map Component (Phase 3, Member 2 + Member 4)
=================================================================
UPDATED: now wired to the REAL backend (Pranav's /api/workers and
/api/alerts), instead of fully hardcoded placeholder data.

WHY A WORKER-TO-ZONE LOOKUP TABLE EXISTS BELOW:
Pranav's backend has no "zone" concept at all (confirmed by checking
his actual MySQL tables — Workers/Alerts have no zone column, and
no endpoint returns one). Rather than asking him to add a zone field
mid-hackathon, zones are assigned here on the frontend: each known
worker ID is manually mapped to one of the 3 Phase-1 zones. This is
a deliberate, documented workaround — not a guess at a missing field.

WHEN A WORKER LIST CHANGES:
If new workers get added (or these 4 get replaced), update
WORKER_ZONE_MAP below to match. If this becomes painful to maintain
by hand, that's the signal to revisit asking Pranav for a real zone
field — but for now, 4 known workers is small enough to hardcode.

HOW ZONE RISK IS CALCULATED:
For each zone, this takes the HIGHEST severity among any unresolved
alert belonging to a worker in that zone ("worst signal wins" — the
same design philosophy used in app.py's risk scoring). A zone with
one Critical alert shows as red, even if other workers in that zone
are perfectly calm.

WHERE THIS GOES: frontend/src/pages/RiskMap.jsx

REQUIRES:
  npm install leaflet react-leaflet axios
  (run this inside your /frontend folder)

AUTH NOTE: like AnalyticsPage.jsx, this expects a `token` prop for
the protected /api/alerts call. /api/workers is actually public per
the docs, but /api/alerts is JWT-protected.

USAGE:
  import RiskMap from './pages/RiskMap';
  ...
  <RiskMap token={token} />
*/

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Generic placeholder site location (not a real job site) — swap for
// your actual coordinates when available. Same location used since
// the first version of this component.
const SITE_CENTER = { lat: 28.6139, lng: 77.2090 };

// ---------------------------------------------------------------
// WORKER -> ZONE LOOKUP (the frontend-side workaround — see note
// at the top of this file for why this exists)
// ---------------------------------------------------------------
const WORKER_ZONE_MAP = {
  'W-001': 'A',
  'W-002': 'A',
  'W-003': 'B',
  'W-004': 'C'
};

const ZONE_DEFINITIONS = {
  A: { zone_name: 'Zone A - Excavation', lat: 28.6149, lng: 77.2080 },
  B: { zone_name: 'Zone B - Lifting', lat: 28.6135, lng: 77.2100 },
  C: { zone_name: 'Zone C - Fabrication', lat: 28.6125, lng: 77.2085 }
};

// Severity ranking used for "worst signal wins" per zone.
// Matches the real severity strings returned by /api/alerts.
const SEVERITY_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

const RISK_COLORS = {
  LOW: { stroke: '#3b6d11', fill: '#97c459' },
  MEDIUM: { stroke: '#854f0b', fill: '#ef9f27' },
  HIGH: { stroke: '#a32d2d', fill: '#e24b4a' },
  CRITICAL: { stroke: '#5c1414', fill: '#7a1f1f' }
};

// Maps real severity strings (Low/Medium/High/Critical) onto the
// LOW/MEDIUM/HIGH/CRITICAL keys used for coloring above.
function severityToRiskLevel(severity) {
  return (severity || 'Low').toUpperCase();
}

/*
Pulls real worker + alert data and builds the zone summary RiskMap
needs. Replaces the old fetchZoneRiskData() placeholder entirely.
*/
async function fetchZoneRiskData(token) {
  // NOTE: M3's docs list /api/workers under "Protected - JWT Required"
  // already, but an earlier version of this file mistakenly called it
  // without a token (based on inconsistent behavior seen during manual
  // curl testing). It returned a 401 in the browser — adding the same
  // Authorization header used for /api/alerts fixes it.
  const [workersRes, alertsRes] = await Promise.all([
    axios.get(`${API_BASE}/workers`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    axios.get(`${API_BASE}/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { resolved: false }
    })
  ]);

  const workers = workersRes.data.data;
  const alerts = alertsRes.data.data;

  // Start every zone at LOW with zero workers, then fill in as we go
  const zoneSummary = {};
  Object.entries(ZONE_DEFINITIONS).forEach(([zoneId, def]) => {
    zoneSummary[zoneId] = {
      zone_id: zoneId,
      zone_name: def.zone_name,
      lat: def.lat,
      lng: def.lng,
      risk_level: 'LOW',
      worker_count: 0,
      active_alerts: []
    };
  });

  // Count workers per zone
  workers.forEach((worker) => {
    const zoneId = WORKER_ZONE_MAP[worker.id];
    if (zoneId && zoneSummary[zoneId]) {
      zoneSummary[zoneId].worker_count += 1;
    }
  });

  // Apply "worst signal wins": each unresolved alert can only raise
  // its zone's risk level, never lower it below what's already set
  alerts.forEach((alert) => {
    const zoneId = WORKER_ZONE_MAP[alert.workerId];
    if (!zoneId || !zoneSummary[zoneId]) return;

    const incomingLevel = severityToRiskLevel(alert.severity);
    const currentRank = SEVERITY_RANK[
      zoneSummary[zoneId].risk_level.charAt(0) + zoneSummary[zoneId].risk_level.slice(1).toLowerCase()
    ] || 1;
    const incomingRank = SEVERITY_RANK[alert.severity] || 1;

    if (incomingRank > currentRank) {
      zoneSummary[zoneId].risk_level = incomingLevel;
    }
    zoneSummary[zoneId].active_alerts.push({
      workerName: alert.Worker?.name || alert.workerId,
      type: alert.type,
      severity: alert.severity,
      description: alert.description
    });
  });

  return Object.values(zoneSummary);
}

function RiskMap({ token }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadZones() {
      try {
        const data = await fetchZoneRiskData(token);
        if (isMounted) {
          setZones(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Could not load zone risk data. Confirm the backend is running and your session is valid.');
          setLoading(false);
        }
      }
    }

    loadZones();
    // Auto-refresh every 10 seconds so the map reflects new alerts
    // as they come in, without needing a manual page reload.
    const interval = setInterval(loadZones, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  if (loading) {
    return (
      <div style={styles.statusBox}>
        <p>Loading site map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.statusBox}>
        <p style={{ color: '#a32d2d' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Site risk map</h2>
        <p style={styles.subtitle}>
          Live zone-level risk, derived from unresolved worker alerts
        </p>
      </div>

      <MapContainer
        center={[SITE_CENTER.lat, SITE_CENTER.lng]}
        zoom={16}
        style={{ height: '420px', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {zones.map((zone) => {
          const color = RISK_COLORS[zone.risk_level] || RISK_COLORS.LOW;
          return (
            <Circle
              key={zone.zone_id}
              center={[zone.lat, zone.lng]}
              radius={60}
              pathOptions={{
                color: color.stroke,
                fillColor: color.fill,
                fillOpacity: 0.5,
                weight: 2
              }}
            >
              <Popup>
                <strong>{zone.zone_name}</strong>
                <br />
                Risk level: {zone.risk_level}
                <br />
                Workers in zone: {zone.worker_count}
                {zone.active_alerts.length > 0 && (
                  <>
                    <br /><br />
                    <strong>Active alerts:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                      {zone.active_alerts.map((a, i) => (
                        <li key={i}>{a.workerName}: {a.type} ({a.severity})</li>
                      ))}
                    </ul>
                  </>
                )}
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>

      <div style={styles.legend}>
        {Object.entries(RISK_COLORS).map(([level, color]) => (
          <div key={level} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: color.fill, borderColor: color.stroke }} />
            <span style={styles.legendLabel}>{level}</span>
          </div>
        ))}
      </div>

      <div style={styles.zoneList}>
        {zones.map((zone) => (
          <div key={zone.zone_id} style={styles.zoneCard}>
            <span
              style={{
                ...styles.zoneDot,
                backgroundColor: RISK_COLORS[zone.risk_level].fill
              }}
            />
            <div>
              <p style={styles.zoneName}>{zone.zone_name}</p>
              <p style={styles.zoneMeta}>
                {zone.worker_count} workers - {zone.active_alerts.length} active alert(s)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: 'sans-serif',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '1rem'
  },
  header: {
    marginBottom: '1rem'
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0
  },
  subtitle: {
    fontSize: '13px',
    color: '#666',
    margin: '4px 0 0'
  },
  statusBox: {
    padding: '2rem',
    textAlign: 'center',
    color: '#666'
  },
  legend: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
    fontSize: '13px',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'inline-block'
  },
  legendLabel: {
    color: '#444'
  },
  zoneList: {
    marginTop: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px'
  },
  zoneCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fafafa'
  },
  zoneDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  zoneName: {
    fontSize: '14px',
    fontWeight: 500,
    margin: 0
  },
  zoneMeta: {
    fontSize: '12px',
    color: '#777',
    margin: '2px 0 0'
  }
};

export default RiskMap;
