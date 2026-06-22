# 🛡️ SafeSphere
### AI-Powered Predictive Worker Safety Platform

SafeSphere is an intelligent safety platform designed to monitor worker health, detect high-risk safety hazards, predict fatigue, and trigger instant alerts using real-time wearable sensor streams (Heart Rate, Temperature, Accelerometer, SOS) integrated with an AI engine and supervisor dashboard.

---

## 👥 Team Overview & Roles

| Member | Primary Role | Core Tech Stack | Focus Area |
| :--- | :--- | :--- | :--- |
| **M1** | ML/DL Specialist | Python, Scikit-learn, Pandas, NumPy | AI/ML Models, Risk Engine, Fatigue Prediction |
| **M2** | Full-Stack + AI/ML | React.js, JavaScript, Python, MySQL | Dashboard UI, Data Pipeline, ML Microservice |
| **M3** | Backend + AI/ML | Node.js, Express, Python, MongoDB, MySQL | API Server, Sensor Data Ingestion, WebSocket alerts |
| **M4** | MERN Developer | MongoDB, Express, React, Node.js | Supervisor Dashboard, JWT Auth, Real-time UI |

---

## 🏗️ System Architecture

SafeSphere is built as a distributed application consisting of 4 distinct layers:
1. **Sensor Simulator**: A Python script simulating wearable sensor outputs.
2. **AI Microservice**: A Python FastAPI backend running ML models (Fall Detection, Fatigue, HR Anomalies).
3. **Backend API**: A Node.js Express server acting as the data coordinator, storing logs in MySQL/MongoDB and broadcasting status changes via Socket.io.
4. **Supervisor Dashboard**: A Vite React single-page application for real-time visualization, alert feeds, and historical analytics.

---

## 📂 Repository Directory Structure

```text
SAFESPHERE/
├── docs/                       # Project documentation & schemas
├── backend/                    # Node.js Express & Socket.io server
├── ai_engine/                  # Python FastAPI microservice & ML models
└── frontend/                   # React.js SPA (Vite scaffolded)
```

For setup and execution guides, please refer to the respective subdirectories.
