# SafeSphere Database Schemas

SafeSphere utilizes a dual-database approach to handle distinct data requirements:
- **MongoDB**: For high-throughput, low-latency storage of time-series raw sensor logs.
- **MySQL**: For relational, structured, and transactional records (Workers, Incident logs, System Alerts, and Supervisors).

---

## 1. MongoDB Schema (Mongoose Models)

### Sensor Stream Collection (`sensor_streams`)
Stores real-time telemetry from worker wearables.
```javascript
const SensorStreamSchema = new Mongoose.Schema({
  workerId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  heartRate: { type: Number, required: true },
  temperature: { type: Number, required: true },
  accelerometer: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  sosPressed: { type: Boolean, default: false }
}, { expires: '7d' }); // Auto-expire logs after 7 days
```

---

## 2. MySQL Schema (Sequelize Models)

### Workers Table (`workers`)
Stores worker profile details.
```sql
CREATE TABLE workers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'Operator',
  zone VARCHAR(50) DEFAULT 'Main Area',
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Alerts Table (`alerts`)
Logs worker incidents and system warnings.
```sql
CREATE TABLE alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'FALL', 'HEART_RATE_ANOMALY', 'HEAT_STRESS', 'SOS'
  severity VARCHAR(20) NOT NULL, -- 'WARNING', 'CRITICAL'
  message VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
```

### Supervisors Table (`supervisors`)
Stores credentials for supervisor logins.
```sql
CREATE TABLE supervisors (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
