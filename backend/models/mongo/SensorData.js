const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    index: true
  },
  heartRate: {
    type: Number,
    required: true
  },
  bodyTemp: {
    type: Number,
    required: true
  },
  envTemp: {
    type: Number,
    required: true
  },
  accelerometer: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  sosPressed: {
    type: Boolean,
    required: true,
    default: false
  },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  riskScore: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Low'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
