const { validationResult } = require('express-validator');
const { processSensorTelemetry } = require('../services/alertEngine');

// @desc    Ingest real-time worker sensor telemetry
// @route   POST /api/sensor-data
// @access  Public
const postSensorData = async (req, res) => {
  // Validate incoming request structure
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const result = await processSensorTelemetry(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Sensor data ingestion server error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error processing sensor telemetry stream'
    });
  }
};

module.exports = {
  postSensorData
};
