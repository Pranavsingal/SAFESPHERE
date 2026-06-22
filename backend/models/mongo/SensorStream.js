const mongoose = require('mongoose');

const SensorStreamSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  heartRate: {
    type: Number,
    required: true
  },
  temperature: {
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
    default: false
  }
}, {
  // Automatically clean up sensor logs after 7 days to preserve storage
  timestamps: false,
  collection: 'sensor_streams'
});

// Add TTL index to delete document after 7 days (604800 seconds)
SensorStreamSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('SensorStream', SensorStreamSchema);
