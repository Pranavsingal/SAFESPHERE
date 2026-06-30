const request = require('supertest');
const app = require('../app');
const SensorData = require('../models/mongo/SensorData');
const Alert = require('../models/mysql/Alert');
const Worker = require('../models/mysql/Worker');
const socketService = require('../services/socketService');
const axios = require('axios');

// Mock all external interfaces
jest.mock('../models/mongo/SensorData');
jest.mock('../models/mysql/Alert');
jest.mock('../models/mysql/Worker');
jest.mock('../services/socketService');
jest.mock('axios');

describe('Sensor Ingestion & Alert Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sensor-data', () => {
    it('should ingest normal telemetry, return low risk, and save to MongoDB', async () => {
      // Simulate ML microservice offline (error/fail)
      axios.post.mockRejectedValue(new Error('ML connection refused'));

      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        role: 'Welder'
      });

      SensorData.create.mockResolvedValue({ _id: 'mongo-log-id' });

      const res = await request(app)
        .post('/api/sensor-data')
        .send({
          workerId: 'W-001',
          heartRate: 75,
          bodyTemp: 36.8,
          envTemp: 24.5,
          accelerometer: { x: 0.1, y: 0.2, z: 9.8 },
          sosPressed: false,
          location: { lat: 37.7749, lng: -122.4194 }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.riskLevel).toEqual('Low');
      expect(res.body.riskScore).toBeLessThan(40);
      expect(SensorData.create).toHaveBeenCalled();
      expect(Alert.create).not.toHaveBeenCalled();
      expect(socketService.broadcastHealthUpdate).toHaveBeenCalled();
    });

    it('should trigger emergency alert and log to MySQL when SOS is pressed', async () => {
      axios.post.mockRejectedValue(new Error('ML connection refused'));

      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        role: 'Welder'
      });

      Alert.create.mockResolvedValue({
        id: 42,
        workerId: 'W-001',
        type: 'SOS',
        severity: 'Critical',
        description: 'Emergency SOS button pressed by worker!',
        timestamp: new Date()
      });

      SensorData.create.mockResolvedValue({ _id: 'mongo-log-id' });

      const res = await request(app)
        .post('/api/sensor-data')
        .send({
          workerId: 'W-001',
          heartRate: 75,
          bodyTemp: 36.8,
          envTemp: 24.5,
          accelerometer: { x: 0.1, y: 0.2, z: 9.8 },
          sosPressed: true,
          location: { lat: 37.7749, lng: -122.4194 }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.riskLevel).toEqual('Critical');
      expect(res.body.riskScore).toEqual(100);
      expect(Alert.create).toHaveBeenCalled();
      expect(socketService.broadcastAlert).toHaveBeenCalled();
    });

    it('should trigger fall alert on high acceleration impact', async () => {
      axios.post.mockRejectedValue(new Error('ML connection refused'));

      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        role: 'Welder'
      });

      Alert.create.mockResolvedValue({
        id: 43,
        workerId: 'W-001',
        type: 'Fall',
        severity: 'Critical',
        timestamp: new Date()
      });

      const res = await request(app)
        .post('/api/sensor-data')
        .send({
          workerId: 'W-001',
          heartRate: 80,
          bodyTemp: 37.0,
          envTemp: 25.0,
          accelerometer: { x: 26.0, y: 0.0, z: 0.0 }, // Acceleration > 25 m/s^2
          sosPressed: false,
          location: { lat: 37.7749, lng: -122.4194 }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.riskLevel).toEqual('Critical');
      expect(Alert.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Fall', severity: 'Critical' })
      );
    });

    it('should trigger heat-stress alert on abnormal core body temperature', async () => {
      axios.post.mockRejectedValue(new Error('ML connection refused'));

      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        role: 'Welder'
      });

      Alert.create.mockResolvedValue({
        id: 44,
        workerId: 'W-001',
        type: 'Heat Stress',
        severity: 'High',
        timestamp: new Date()
      });

      const res = await request(app)
        .post('/api/sensor-data')
        .send({
          workerId: 'W-001',
          heartRate: 80,
          bodyTemp: 39.2, // Body temp > 38.5
          envTemp: 35.0,
          accelerometer: { x: 0.0, y: 0.0, z: 9.8 },
          sosPressed: false,
          location: { lat: 37.7749, lng: -122.4194 }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.riskLevel).toEqual('High');
      expect(Alert.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Heat Stress', severity: 'High' })
      );
    });

    it('should trigger heart rate anomaly on critical pulse readings', async () => {
      axios.post.mockRejectedValue(new Error('ML connection refused'));

      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        role: 'Welder'
      });

      Alert.create.mockResolvedValue({
        id: 45,
        workerId: 'W-001',
        type: 'Anomaly',
        severity: 'High',
        timestamp: new Date()
      });

      const res = await request(app)
        .post('/api/sensor-data')
        .send({
          workerId: 'W-001',
          heartRate: 135, // Heart rate > 120
          bodyTemp: 37.0,
          envTemp: 25.0,
          accelerometer: { x: 0.0, y: 0.0, z: 9.8 },
          sosPressed: false,
          location: { lat: 37.7749, lng: -122.4194 }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.riskLevel).toEqual('High');
      expect(Alert.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Anomaly', severity: 'High' })
      );
    });

    it('should reject invalid telemetry requests with 400', async () => {
      const res = await request(app)
        .post('/api/sensor-data')
        .send({
          workerId: '', // Invalid empty id
          heartRate: 'not-a-number' // Invalid field
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });
});
