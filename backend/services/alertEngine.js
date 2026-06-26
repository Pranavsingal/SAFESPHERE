const axios = require('axios');
const SensorData = require('../models/mongo/SensorData');
const Alert = require('../models/mysql/Alert');
const Worker = require('../models/mysql/Worker');
const socketService = require('./socketService');
require('dotenv').config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001/predict';

// Fallback rule-based risk evaluation in case ML microservice is offline
const calculateFallbackRisk = (telemetry) => {
  const { heartRate, bodyTemp, envTemp, accelerometer, sosPressed } = telemetry;
  const activeAlerts = [];
  let riskScore = 10; // Base score
  let riskLevel = 'Low';

  // 1. SOS Button Press (Highest priority)
  if (sosPressed) {
    riskScore = 100;
    riskLevel = 'Critical';
    activeAlerts.push({
      type: 'SOS',
      severity: 'Critical',
      description: 'Emergency SOS button pressed by worker!'
    });
  }

  // 2. Fall Detection logic
  // Calculate accelerometer magnitude: sqrt(x^2 + y^2 + z^2)
  // Normal gravity is ~9.8 m/s^2 or ~1.0g depending on sensor calibration.
  if (accelerometer) {
    const { x, y, z } = accelerometer;
    const mag = Math.sqrt(x * x + y * y + z * z);
    
    let isFall = false;
    if (mag > 6.0) {
      // m/s^2 scale (standard gravity ~9.8 m/s^2)
      isFall = mag > 25.0 || mag < 1.5;
    } else {
      // G-force scale (standard gravity ~1.0g)
      isFall = mag > 2.5 || mag < 0.2;
    }
    
    // If telemetry shows fall characteristics and NOT already critical from SOS
    if (isFall && !sosPressed) {
      riskScore = Math.max(riskScore, 90);
      riskLevel = 'Critical';
      activeAlerts.push({
        type: 'Fall',
        severity: 'Critical',
        description: `Potential fall detected! Accelerometer magnitude: ${mag.toFixed(2)}`
      });
    }
  }

  // 3. Heart Rate Anomaly Detection
  if (heartRate > 120 || heartRate < 50) {
    riskScore = Math.max(riskScore, 80);
    if (riskLevel !== 'Critical') riskLevel = 'High';
    activeAlerts.push({
      type: 'Anomaly',
      severity: 'High',
      description: `Heart rate anomaly: ${heartRate} BPM (Normal range: 50-120 BPM)`
    });
  } else if (heartRate > 100 || heartRate < 55) {
    riskScore = Math.max(riskScore, 40);
    if (riskLevel === 'Low') riskLevel = 'Medium';
  }

  // 4. Heat Stress Detection
  if (bodyTemp > 38.5) {
    riskScore = Math.max(riskScore, 85);
    if (riskLevel !== 'Critical') riskLevel = 'High';
    activeAlerts.push({
      type: 'Heat Stress',
      severity: 'High',
      description: `Critical core body temperature: ${bodyTemp}°C (Normal range: <37.8°C)`
    });
  } else if (bodyTemp > 37.8 || envTemp > 38) {
    riskScore = Math.max(riskScore, 50);
    if (riskLevel === 'Low') riskLevel = 'Medium';
    activeAlerts.push({
      type: 'Fatigue',
      severity: 'Medium',
      description: `Elevated temperature/heat stress. Body: ${bodyTemp}°C, Env: ${envTemp}°C`
    });
  }

  return { riskScore, riskLevel, activeAlerts };
};

// Main processing logic for incoming sensor data stream
const processSensorTelemetry = async (telemetry) => {
  const { workerId, heartRate, bodyTemp, envTemp, accelerometer, sosPressed, location } = telemetry;
  
  let riskScore = 10;
  let riskLevel = 'Low';
  let activeAlerts = [];
  let mlSuccess = false;

  // 1. Attempt to predict using AI Engine (M1/M2 flask microservice)
  try {
    const response = await axios.post(ML_SERVICE_URL, telemetry, { timeout: 1500 });
    if (response.data && response.data.success) {
      riskScore = response.data.riskScore;
      riskLevel = response.data.riskLevel;
      activeAlerts = response.data.alerts || [];
      mlSuccess = true;
      console.log(`ML prediction success: Risk=${riskScore} (${riskLevel})`);
    }
  } catch (error) {
    // If ML API is offline or times out, perform fallback rules calculation
    if (process.env.NODE_ENV !== 'test') {
      console.warn('AI Engine unavailable, executing rule-based safety fallback engine:', error.message);
    }
  }

  // If ML service was not called or failed, run rules engine
  if (!mlSuccess) {
    const fallback = calculateFallbackRisk(telemetry);
    riskScore = fallback.riskScore;
    riskLevel = fallback.riskLevel;
    activeAlerts = fallback.activeAlerts;
  }

  // 2. Ensure worker exists in MySQL to maintain database constraints
  let dbWorker = await Worker.findByPk(workerId);
  if (!dbWorker) {
    // Dynamically auto-create a default worker profile to prevent Foreign Key constraints from throwing errors
    dbWorker = await Worker.create({
      id: workerId,
      name: `Worker ${workerId}`,
      role: 'Field Operator',
      status: 'Active'
    });
    console.log(`Auto-created worker profile for database sync: ${workerId}`);
  }

  // 3. Save alerts/incidents to MySQL for logs
  const createdAlerts = [];
  for (const alertInfo of activeAlerts) {
    try {
      const dbAlert = await Alert.create({
        workerId,
        type: alertInfo.type,
        severity: alertInfo.severity,
        description: alertInfo.description,
        timestamp: new Date(),
        resolved: false
      });
      
      const alertPayload = {
        id: dbAlert.id,
        workerId,
        workerName: dbWorker.name,
        type: dbAlert.type,
        severity: dbAlert.severity,
        description: dbAlert.description,
        timestamp: dbAlert.timestamp,
        resolved: false
      };

      createdAlerts.push(alertPayload);

      // Broadcast alert immediately via WebSocket
      socketService.broadcastAlert(alertPayload);
    } catch (dbErr) {
      console.error('Failed to log alert to MySQL:', dbErr.message);
    }
  }

  // 4. Save raw log stream to MongoDB
  let mongoLog;
  try {
    mongoLog = await SensorData.create({
      workerId,
      heartRate,
      bodyTemp,
      envTemp,
      accelerometer,
      sosPressed,
      location,
      riskScore,
      riskLevel,
      timestamp: new Date()
    });
  } catch (mongoErr) {
    console.error('Failed to log stream to MongoDB:', mongoErr.message);
  }

  // 5. Broadcast real-time worker updates
  const healthUpdatePayload = {
    workerId,
    workerName: dbWorker.name,
    role: dbWorker.role,
    heartRate,
    bodyTemp,
    envTemp,
    accelerometer,
    sosPressed,
    location,
    riskScore,
    riskLevel,
    timestamp: new Date(),
    activeAlerts: createdAlerts
  };
  socketService.broadcastHealthUpdate(healthUpdatePayload);

  return {
    success: true,
    riskScore,
    riskLevel,
    loggedAlerts: createdAlerts,
    mongoId: mongoLog ? mongoLog._id : null
  };
};

module.exports = {
  processSensorTelemetry,
  calculateFallbackRisk
};
