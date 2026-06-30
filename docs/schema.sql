-- =========================================
-- SAFESPHERE DATABASE — CLEAN REBUILD
-- =========================================
DROP DATABASE IF EXISTS safesphere;
CREATE DATABASE safesphere;
USE safesphere;

-- ---------- TABLE 1: WORKERS ----------
CREATE TABLE workers (
    worker_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    zone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- TABLE 2: ALERTS ----------
CREATE TABLE alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,   -- FALL, HEART_RATE, TEMPERATURE, SOS
    severity VARCHAR(10) NOT NULL,     -- LOW, MEDIUM, HIGH
    triggered_at TIMESTAMP NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
);

-- ---------- TABLE 3: INCIDENTS ----------
CREATE TABLE incidents (
    incident_id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    alert_id INT,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',  -- OPEN, INVESTIGATING, CLOSED
    reported_at TIMESTAMP NOT NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
    FOREIGN KEY (alert_id) REFERENCES alerts(alert_id)
);

-- =========================================
-- SAMPLE DATA — 15 workers across 3 zones
-- =========================================
INSERT INTO workers (name, role, device_id, zone) VALUES
('Ramesh Kumar',    'Site Worker',      'DEV001', 'Zone A - Excavation'),
('Sita Sharma',     'Site Worker',      'DEV002', 'Zone A - Excavation'),
('Amit Patel',      'Crane Operator',   'DEV003', 'Zone B - Lifting'),
('Priya Nair',      'Site Worker',      'DEV004', 'Zone A - Excavation'),
('Vikram Singh',    'Welder',           'DEV005', 'Zone C - Fabrication'),
('Anjali Desai',    'Site Worker',      'DEV006', 'Zone B - Lifting'),
('Rohan Mehta',     'Electrician',      'DEV007', 'Zone C - Fabrication'),
('Kavita Joshi',    'Site Worker',      'DEV008', 'Zone A - Excavation'),
('Suresh Reddy',    'Crane Operator',   'DEV009', 'Zone B - Lifting'),
('Neha Gupta',      'Site Worker',      'DEV010', 'Zone A - Excavation'),
('Arjun Malhotra',  'Welder',           'DEV011', 'Zone C - Fabrication'),
('Pooja Iyer',      'Supervisor',       'DEV012', 'Zone A - Excavation'),
('Karan Verma',     'Site Worker',      'DEV013', 'Zone B - Lifting'),
('Divya Rao',       'Electrician',      'DEV014', 'Zone C - Fabrication'),
('Manoj Kumar',     'Site Worker',      'DEV015', 'Zone B - Lifting');

-- =========================================
-- ALERTS — spread across a realistic work week
-- (severity matches alert_type logically)
-- =========================================
INSERT INTO alerts (worker_id, alert_type, severity, triggered_at, resolved) VALUES
(1,  'HEART_RATE',  'HIGH',   '2026-06-16 09:14:00', TRUE),
(2,  'TEMPERATURE', 'MEDIUM', '2026-06-16 11:32:00', TRUE),
(5,  'FALL',        'HIGH',   '2026-06-16 14:05:00', FALSE),
(8,  'SOS',         'HIGH',   '2026-06-16 15:47:00', TRUE),
(3,  'TEMPERATURE', 'LOW',    '2026-06-17 10:02:00', TRUE),
(4,  'HEART_RATE',  'MEDIUM', '2026-06-17 12:18:00', TRUE),
(7,  'FALL',        'HIGH',   '2026-06-17 13:40:00', TRUE),
(9,  'HEART_RATE',  'HIGH',   '2026-06-17 16:23:00', FALSE),
(2,  'TEMPERATURE', 'HIGH',   '2026-06-18 11:55:00', FALSE),
(6,  'SOS',         'HIGH',   '2026-06-18 13:10:00', TRUE),
(11, 'FALL',        'MEDIUM', '2026-06-18 14:32:00', TRUE),
(13, 'HEART_RATE',  'LOW',    '2026-06-18 09:48:00', TRUE),
(1,  'TEMPERATURE', 'MEDIUM', '2026-06-19 12:00:00', TRUE),
(10, 'HEART_RATE',  'HIGH',   '2026-06-19 14:15:00', FALSE),
(14, 'FALL',        'HIGH',   '2026-06-19 15:02:00', FALSE),
(5,  'HEART_RATE',  'MEDIUM', '2026-06-19 16:40:00', TRUE),
(15, 'TEMPERATURE', 'HIGH',   '2026-06-20 11:20:00', FALSE),
(3,  'SOS',         'HIGH',   '2026-06-20 13:55:00', TRUE),
(8,  'HEART_RATE',  'LOW',    '2026-06-20 09:30:00', TRUE),
(12, 'TEMPERATURE', 'MEDIUM', '2026-06-20 10:45:00', TRUE),
(4,  'FALL',        'HIGH',   '2026-06-21 11:10:00', FALSE),
(9,  'TEMPERATURE', 'LOW',    '2026-06-21 12:32:00', TRUE),
(6,  'HEART_RATE',  'MEDIUM', '2026-06-21 14:48:00', TRUE),
(11, 'SOS',         'HIGH',   '2026-06-21 15:55:00', TRUE),
(7,  'HEART_RATE',  'HIGH',   '2026-06-22 09:05:00', FALSE);

-- =========================================
-- INCIDENTS — only for HIGH severity / unresolved alerts
-- (this is what makes it "correct": not every alert becomes
-- an incident, only the serious / unresolved ones do)
-- =========================================
INSERT INTO incidents (worker_id, alert_id, description, status, reported_at) VALUES
(1,  1,  'Heart rate spiked to 165 BPM during excavation shift. Worker rested, recovered within 10 min.', 'CLOSED',        '2026-06-16 09:16:00'),
(5,  3,  'Fall detected via accelerometer near fabrication bay. Worker unresponsive for 30 sec, EMT dispatched.', 'INVESTIGATING', '2026-06-16 14:07:00'),
(8,  4,  'SOS button pressed near Zone A trench edge. Supervisor reached worker within 4 minutes.', 'CLOSED',        '2026-06-16 15:49:00'),
(7,  7,  'Fall while welding in Zone C, minor injury to wrist. First aid administered on site.', 'CLOSED',        '2026-06-17 13:42:00'),
(9,  8,  'Sustained high heart rate (172 BPM) for 6+ minutes, possible cardiac stress. Sent to site medic.', 'INVESTIGATING', '2026-06-17 16:25:00'),
(2,  9,  'Body temperature reading of 39.1°C flagged as heat stress risk in Zone A midday heat.', 'OPEN',          '2026-06-18 11:57:00'),
(6,  10, 'SOS triggered during crane lift operation, worker reported equipment malfunction nearby.', 'CLOSED',        '2026-06-18 13:12:00'),
(10, 14, 'Heart rate anomaly flagged during afternoon shift, isolation forest model confidence 91%.', 'OPEN',          '2026-06-19 14:17:00'),
(14, 15, 'Fall detected in Zone C, worker slipped on wet surface near fabrication area.', 'OPEN',          '2026-06-19 15:04:00'),
(15, 17, 'Heat stress alert during peak afternoon temperature, worker relocated to shaded rest zone.', 'OPEN',          '2026-06-20 11:22:00'),
(3,  18, 'SOS pressed accidentally during equipment transport, confirmed false alarm after callback.', 'CLOSED',        '2026-06-20 13:57:00'),
(4,  21, 'Fall detected near excavation pit edge, worker caught by safety harness, no injury.', 'INVESTIGATING', '2026-06-21 11:12:00'),
(11, 24, 'SOS triggered during lifting operation, suspected near-miss with crane load swing.', 'CLOSED',        '2026-06-21 15:57:00'),
(7,  25, 'Heart rate anomaly detected early morning shift, recommend fatigue check-in.', 'OPEN',          '2026-06-22 09:07:00');