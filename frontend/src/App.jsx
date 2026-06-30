/*
SafeSphere - Combined Demo Dashboard (App.jsx)
==================================================
Combines RiskMap, AnalyticsPage, and CCTVPanel into one screen with
tab buttons, so a live demo never requires editing code mid-meeting.

This is meant to be a TEMPORARY stand-in for App.jsx until the team
builds a real dashboard layout (with proper routing, navigation,
etc). It's a genuine usability upgrade over swapping imports by
hand, but it's still not the final production dashboard structure.

WHERE THIS GOES: frontend/src/App.jsx (replaces existing content)

REQUIRES: all three components already built and present at:
  - frontend/src/pages/RiskMap.jsx
  - frontend/src/pages/AnalyticsPage.jsx
  - frontend/src/components/CCTVPanel.jsx
*/

import { useState } from 'react';
import RiskMap from './pages/RiskMap';
import AnalyticsPage from './pages/AnalyticsPage';
import CCTVPanel from './components/CCTVPanel';

// TODO: replace with real auth/session token once login flow exists
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg1NDdhMjBjLWEyODQtNGU5Yi1hMGRhLWUxYzUzYTAwOTZkZSIsInVzZXJuYW1lIjoia3JpdGkiLCJuYW1lIjoiS3JpdGkiLCJpYXQiOjE3ODI2Mzg3ODksImV4cCI6MTc4NTIzMDc4OX0.ezm8EAlLZ1stOTZObXrkJKZa061u_I7NRKmGi7-Xhik";

const TABS = [
  { id: 'riskmap', label: 'Risk Map' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'cctv', label: 'Cameras' }
];

function App() {
  const [activeTab, setActiveTab] = useState('riskmap');

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.brand}>SafeSphere</span>
        <div style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabButtonActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={styles.main}>
        {activeTab === 'riskmap' && <RiskMap token={TOKEN} />}
        {activeTab === 'analytics' && <AnalyticsPage token={TOKEN} />}
        {activeTab === 'cctv' && <CCTVPanel />}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f3ee',
    fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif"
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    backgroundColor: '#2b2820',
    borderBottom: '3px solid #97c459'
  },
  brand: {
    color: '#fdfcf9',
    fontWeight: 700,
    fontSize: '16px',
    letterSpacing: '0.02em'
  },
  tabs: {
    display: 'flex',
    gap: '6px'
  },
  tabButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#b8b4a5',
    cursor: 'pointer'
  },
  tabButtonActive: {
    backgroundColor: '#97c459',
    color: '#1f1d18'
  },
  main: {
    padding: '24px 0'
  }
};

export default App;
