const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');

const { registerSupervisor, loginSupervisor } = require('../controllers/authController');
const { getWorkers, createWorker, updateWorker, deleteWorker } = require('../controllers/workerController');
const { postSensorData } = require('../controllers/sensorController');
const { getAlerts, resolveAlert, getWeeklyReport } = require('../controllers/alertController');

const router = express.Router();

// --- Auth Routes ---
router.post('/auth/register', registerSupervisor);
router.post('/auth/login', loginSupervisor);

// --- Workers CRUD (Protected) ---
router.route('/workers')
  .get(protect, getWorkers)
  .post(protect, createWorker);

router.route('/workers/:id')
  .put(protect, updateWorker)
  .delete(protect, deleteWorker);

// --- Sensor Telemetry Ingestion (Public - Simulated Devices) ---
router.post(
  '/sensor-data',
  [
    body('workerId').notEmpty().withMessage('workerId is required'),
    body('heartRate').isNumeric().withMessage('heartRate must be a number'),
    body('bodyTemp').isNumeric().withMessage('bodyTemp must be a number'),
    body('envTemp').isNumeric().withMessage('envTemp must be a number'),
    body('accelerometer.x').isNumeric().withMessage('accelerometer.x must be a number'),
    body('accelerometer.y').isNumeric().withMessage('accelerometer.y must be a number'),
    body('accelerometer.z').isNumeric().withMessage('accelerometer.z must be a number'),
    body('sosPressed').isBoolean().withMessage('sosPressed must be a boolean')
  ],
  postSensorData
);

// --- Alerts / Incidents Routes (Protected) ---
router.get('/alerts', protect, getAlerts);
router.put('/alerts/:id', protect, resolveAlert);

// --- Analytical Reports (Protected) ---
router.get('/reports/weekly', protect, getWeeklyReport);

module.exports = router;
