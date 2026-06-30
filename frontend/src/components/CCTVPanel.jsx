/*
SafeSphere - CCTV Panel Stub (Phase 3, Member 2)
==================================================
A placeholder UI panel for live camera feeds — NOT real camera
integration. Per the implementation plan, this phase only needs an
empty stub ready for whenever (if ever) real camera feeds get wired
up; actual video integration is out of scope for the hackathon.

WHAT THIS SHOWS:
A 4-slot camera grid, matching your 3 work zones (A/B/C) from
Phase 1 plus one general site-overview slot. Each slot shows an
"offline" placeholder state rather than a real video stream.

WHERE THIS GOES: frontend/src/components/CCTVPanel.jsx
(this is a component, not a full page, since it's meant to be
dropped into the main dashboard alongside RiskMap/AnalyticsPage,
not navigated to on its own)

USAGE:
  import CCTVPanel from '../components/CCTVPanel';
  ...
  <CCTVPanel />

FUTURE INTEGRATION NOTE: when real camera feeds become available,
each slot's placeholder div can be swapped for a <video> tag or
an embedded stream player (e.g. an HLS.js player pointed at each
camera's stream URL). The grid layout and zone labeling stay the
same either way.
*/

import { useState } from 'react';

const CAMERA_SLOTS = [
  { id: 'cam-1', label: 'Zone A - Excavation', status: 'offline' },
  { id: 'cam-2', label: 'Zone B - Lifting', status: 'offline' },
  { id: 'cam-3', label: 'Zone C - Fabrication', status: 'offline' },
  { id: 'cam-4', label: 'Site overview', status: 'offline' }
];

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b6557" strokeWidth="1.5">
      <path d="M3 8.5a2 2 0 0 1 2-2h2.5l1-1.5h7l1 1.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function CameraSlot({ camera }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={styles.slot}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
    >
      <div style={styles.slotHeader}>
        <span style={styles.slotLabel}>{camera.label}</span>
        <span style={styles.statusBadge}>
          <span style={styles.statusDot} />
          OFFLINE
        </span>
      </div>
      <div style={styles.slotBody}>
        <CameraIcon />
        <p style={styles.slotMessage}>No feed connected</p>
      </div>
    </div>
  );
}

function CCTVPanel() {
  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Site cameras</h2>
        <span style={styles.subtitle}>
          {CAMERA_SLOTS.length} slots reserved · 0 connected
        </span>
      </div>

      <div style={styles.grid}>
        {CAMERA_SLOTS.map((camera) => (
          <CameraSlot key={camera.id} camera={camera} />
        ))}
      </div>

      <p style={styles.footnote}>
        Camera feeds are not yet integrated. This panel is a placeholder
        reserving layout space for live video once hardware is connected.
      </p>
    </section>
  );
}

const styles = {
  wrapper: {
    fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif",
    maxWidth: '720px',
    margin: '0 auto',
    padding: '1rem',
    color: '#2b2820'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '14px'
  },
  title: { fontSize: '16px', fontWeight: 700, margin: 0 },
  subtitle: { fontSize: '12px', color: '#8a8470' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  slot: {
    border: '1px solid #ddd8cb',
    borderRadius: '6px',
    backgroundColor: '#1f1d18',
    overflow: 'hidden',
    cursor: 'pointer'
  },
  slotHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    backgroundColor: '#2b2820'
  },
  slotLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#fdfcf9'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#b3392f'
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#b3392f',
    display: 'inline-block'
  },
  slotBody: {
    height: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundImage: 'repeating-linear-gradient(45deg, #2b2820 0, #2b2820 1px, #1f1d18 1px, #1f1d18 12px)'
  },
  slotMessage: {
    fontSize: '11px',
    color: '#8a8470',
    margin: 0
  },
  footnote: {
    fontSize: '11px',
    color: '#8a8470',
    marginTop: '14px',
    fontStyle: 'italic'
  }
};

export default CCTVPanel;
