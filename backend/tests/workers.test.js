const request = require('supertest');
const app = require('../app');
const Worker = require('../models/mysql/Worker');

// Mock Auth Middleware to auto-authorize test calls
jest.mock('../middlewares/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'supervisor-123', username: 'jsuper' };
    next();
  }
}));

// Mock Worker Model
jest.mock('../models/mysql/Worker');

describe('Workers CRUD Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/workers', () => {
    it('should return a list of all workers', async () => {
      Worker.findAll.mockResolvedValue([
        { id: 'W-001', name: 'John Doe', role: 'Welder', status: 'Active' },
        { id: 'W-002', name: 'Jane Smith', role: 'Electrician', status: 'Active' }
      ]);

      const res = await request(app).get('/api/workers');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toEqual(2);
      expect(res.body.data[0].name).toEqual('John Doe');
    });
  });

  describe('POST /api/workers', () => {
    it('should register a new worker profile', async () => {
      Worker.findByPk.mockResolvedValue(null);
      Worker.create.mockResolvedValue({
        id: 'W-005',
        name: 'Bob Builder',
        role: 'Mason',
        status: 'Active'
      });

      const res = await request(app)
        .post('/api/workers')
        .send({
          id: 'W-005',
          name: 'Bob Builder',
          role: 'Mason'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toEqual('Bob Builder');
    });

    it('should fail if worker already exists', async () => {
      Worker.findByPk.mockResolvedValue({ id: 'W-005' });

      const res = await request(app)
        .post('/api/workers')
        .send({
          id: 'W-005',
          name: 'Bob Builder',
          role: 'Mason'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/workers/:id', () => {
    it('should update worker status or name', async () => {
      const mockSave = jest.fn();
      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        role: 'Welder',
        status: 'Active',
        save: mockSave
      });

      const res = await request(app)
        .put('/api/workers/W-001')
        .send({
          status: 'Inactive'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/workers/:id', () => {
    it('should delete a worker profile', async () => {
      const mockDestroy = jest.fn();
      Worker.findByPk.mockResolvedValue({
        id: 'W-001',
        name: 'John Doe',
        destroy: mockDestroy
      });

      const res = await request(app).delete('/api/workers/W-001');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});
