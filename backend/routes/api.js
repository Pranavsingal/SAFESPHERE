const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');

const { registerSupervisor, loginSupervisor } = require('../controllers/authController');
const { getWorkers, createWorker, updateWorker, deleteWorker } = require('../controllers/workerController');
const { postSensorData } = require('../controllers/sensorController');
const { getAlerts, resolveAlert, getWeeklyReport } = require('../controllers/alertController');

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SupervisorRegister:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - name
 *       properties:
 *         username:
 *           type: string
 *           description: The unique username of the supervisor
 *         password:
 *           type: string
 *           description: The supervisor's password
 *         name:
 *           type: string
 *           description: The full name of the supervisor
 *       example:
 *         username: admin
 *         password: password123
 *         name: John Doe
 *
 *     SupervisorLogin:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: The supervisor's username
 *         password:
 *           type: string
 *           description: The supervisor's password
 *       example:
 *         username: admin
 *         password: password123
 *
 *     Worker:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           description: Unique worker ID
 *         name:
 *           type: string
 *           description: Name of the worker
 *         role:
 *           type: string
 *           description: Job role (e.g., Welder, Electrician, Scaffolder)
 *         status:
 *           type: string
 *           enum: [Active, Inactive]
 *           default: Active
 *           description: Status of the worker
 *       example:
 *         id: W-001
 *         name: John Doe
 *         role: Welder
 *         status: Active
 *
 *     SensorData:
 *       type: object
 *       required:
 *         - workerId
 *         - heartRate
 *         - bodyTemp
 *         - envTemp
 *         - accelerometer
 *         - sosPressed
 *       properties:
 *         workerId:
 *           type: string
 *           description: ID of the worker transmitting telemetry
 *         heartRate:
 *           type: number
 *           description: Heart rate in BPM
 *         bodyTemp:
 *           type: number
 *           description: Body temperature in Celsius
 *         envTemp:
 *           type: number
 *           description: Ambient environment temperature in Celsius
 *         accelerometer:
 *           type: object
 *           properties:
 *             x:
 *               type: number
 *             y:
 *               type: number
 *             z:
 *               type: number
 *         sosPressed:
 *           type: boolean
 *           description: Emergency SOS state
 *         location:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *             lng:
 *               type: number
 *       example:
 *         workerId: W-001
 *         heartRate: 85
 *         bodyTemp: 37.2
 *         envTemp: 26.0
 *         accelerometer:
 *           x: 0.05
 *           y: -0.1
 *           z: 9.81
 *         sosPressed: false
 *         location:
 *           lat: 37.7749
 *           lng: -122.4194
 *
 *     Alert:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique alert ID
 *         workerId:
 *           type: string
 *           description: ID of the associated worker
 *         type:
 *           type: string
 *           description: Type of safety event
 *         severity:
 *           type: string
 *           enum: [Low, Medium, High, Critical]
 *         message:
 *           type: string
 *           description: Alert description message
 *         resolved:
 *           type: boolean
 *           description: Whether the alert has been resolved
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Time when the alert was triggered
 *       example:
 *         id: 1
 *         workerId: W-001
 *         type: Fall Detection
 *         severity: Critical
 *         message: Potential fall detected for worker W-001
 *         resolved: false
 *         timestamp: "2026-06-30T10:00:00.000Z"
 */

// --- Auth Routes ---

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new supervisor
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupervisorRegister'
 *     responses:
 *       201:
 *         description: Supervisor registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Invalid input or username already exists
 *       500:
 *         description: Server error
 */
router.post('/auth/register', registerSupervisor);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a supervisor and get a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SupervisorLogin'
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     token:
 *                       type: string
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */
router.post('/auth/login', loginSupervisor);

// --- Workers CRUD (Protected) ---

/**
 * @openapi
 * /api/workers:
 *   get:
 *     summary: Get all registered worker profiles
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of worker profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Worker'
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Register a new worker profile
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Worker'
 *     responses:
 *       201:
 *         description: Worker profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Worker'
 *       400:
 *         description: Invalid inputs or worker ID already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/workers')
  .get(protect, getWorkers)
  .post(protect, createWorker);

/**
 * @openapi
 * /api/workers/{id}:
 *   put:
 *     summary: Update an existing worker profile
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the worker to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Worker updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Worker'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Worker not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a worker profile
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the worker to delete
 *     responses:
 *       200:
 *         description: Worker deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Worker not found
 *       500:
 *         description: Server error
 */
router.route('/workers/:id')
  .put(protect, updateWorker)
  .delete(protect, deleteWorker);

// --- Sensor Telemetry Ingestion (Public - Simulated Devices) ---

/**
 * @openapi
 * /api/sensor-data:
 *   post:
 *     summary: Submit telemetry readings from wearable devices
 *     tags: [Sensor Ingestion]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SensorData'
 *     responses:
 *       200:
 *         description: Telemetry processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 riskScore:
 *                   type: number
 *                 riskLevel:
 *                   type: string
 *                 loggedAlerts:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Validation failed (missing or invalid properties)
 *       500:
 *         description: Server error
 */
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

/**
 * @openapi
 * /api/alerts:
 *   get:
 *     summary: Retrieve safety incidents and alerts log
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter alerts by resolved status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High, Critical]
 *         description: Filter alerts by severity
 *       - in: query
 *         name: workerId
 *         schema:
 *           type: string
 *         description: Filter alerts by worker ID
 *     responses:
 *       200:
 *         description: A list of alerts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/alerts', protect, getAlerts);

/**
 * @openapi
 * /api/alerts/{id}:
 *   put:
 *     summary: Mark a specific alert as resolved
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the alert to resolve
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.put('/alerts/:id', protect, resolveAlert);

// --- Analytical Reports (Protected) ---

/**
 * @openapi
 * /api/reports/weekly:
 *   get:
 *     summary: Retrieve weekly compliance safety reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly safety report metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeframe:
 *                       type: string
 *                     totalIncidents:
 *                       type: integer
 *                     breakdownByType:
 *                       type: object
 *                     breakdownBySeverity:
 *                       type: object
 *                     trend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     highestRiskWorkers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           workerId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           count:
 *                             type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/reports/weekly', protect, getWeeklyReport);

module.exports = router;
