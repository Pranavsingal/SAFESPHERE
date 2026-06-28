/*
SafeSphere - Risk Map Component (Phase 3, Member 2 + Member 4)
=================================================================
Shows the construction site as a real map (Leaflet.js + OpenStreetMap)
with each work zone color-coded by current risk level:
  green  = LOW risk
  yellow = MEDIUM risk
  red    = HIGH risk

CURRENT STATE: Uses placeholder zone data (see ZONE_DATA below) shaped
EXACTLY like what the real backend should eventually return. When
M3/M4 give you the real endpoint, you only need to change the
`fetchZoneRiskData()` function — nothing else in this file changes.

WHERE THIS GOES: frontend/src/pages/RiskMap.jsx
(or frontend/src/components/RiskMap.jsx if your team prefers it as
a reusable component instead of a full page — ask M4 which pattern
the rest of the dashboard follows)

REQUIRES:
  npm install leaflet react-leaflet
  (run this inside your /frontend folder)

USAGE:
  import RiskMap from './pages/RiskMap';
  ...
  <RiskMap />
*/

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------
// PLACEHOLDER DATA
// Generic placeholder location (not a real job site) - swap the
// lat/lng below for your actual site coordinates when available.
// Structure matches what the real API is expected to return:
//   { zone_id, zone_name, lat, lng, risk_level, risk_score, worker_count }
// ---------------------------------------------------------------
const SITE_CENTER = { lat: 28.6139, lng: 77.2090 }; // generic placeholder coordinates

const PLACEHOLDER_ZONES = [
  {
    zone_id: 'A',
    zone_name: 'Zone A - Excavation',
    lat: 28.6149,
    lng: 77.2080,
    risk_level: 'LOW',
    risk_score: 12,
    worker_count: 5
  },
  {
    zone_id: 'B',
    zone_name: 'Zone B - Lifting',
    lat: 28.6135,
    lng: 77.2100,
    risk_level: 'HIGH',
    risk_score: 78,
    worker_count: 4
  },
  {
    zone_id: 'C',
    zone_name: 'Zone C - Fabrication',
    lat: 28.6125,
    lng: 77.2085,
    risk_level: 'MEDIUM',
    risk_score: 45,
    worker_count: 6
  }
];

// Maps a risk level to a real color + a light fill, used for the
// circle markers on the map and the legend below it.
const RISK_COLORS = {
  LOW: { stroke: '#3b6d11', fill: '#97c459' },
  MEDIUM: { stroke: '#854f0b', fill: '#ef9f27' },
  HIGH: { stroke: '#a32d2d', fill: '#e24b4a' }
};

/*
TODO: REPLACE WITH REAL API CALL
Once M3/M4 confirm the real endpoint, swap this function's body for
something like:

  async function fetchZoneRiskData() {
    const response = await axios.get('http://localhost:5000/api/zones/risk');
    return response.data;
  }

Everything else in this component (the map, the markers, the legend)
stays exactly the same, since it already expects this same shape of
data back.
*/
async function fetchZoneRiskData() {
  // Simulates a network request so the loading state is visible/testable
  return new Promise((resolve) => {
    setTimeout(() => resolve(PLACEHOLDER_ZONES), 400);
  });
}

function RiskMap() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadZones() {
      try {
        const data = await fetchZoneRiskData();
        if (isMounted) {
          setZones(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Could not load zone risk data.');
          setLoading(false);
        }
      }
    }

    loadZones();

    // Auto-refresh every 10 seconds, so the map stays "live" once
    // it's wired to a real endpoint. Harmless with placeholder data.
    const interval = setInterval(loadZones, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
        <p style={styles.subtitle}>Live zone-level risk based on worker sensor data</p>
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
                Risk score: {zone.risk_score}/100
                <br />
                Workers in zone: {zone.worker_count}
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
                {zone.worker_count} workers - score {zone.risk_score}/100
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Plain inline styles for now, so this works regardless of whether
// your team ends up using Tailwind, CSS modules, or plain CSS.
// Swap these for your team's actual styling approach once decided.
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
    fontSize: '13px'
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
