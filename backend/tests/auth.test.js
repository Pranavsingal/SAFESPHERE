const request = require('supertest');
const app = require('../app');
const User = require('../models/mysql/User');

// Mock User Sequelize model
jest.mock('../models/mysql/User');

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new supervisor and return a token', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 'test-uuid-12345',
        name: 'John Supervisor',
        username: 'jsuper',
        password: '$2a$10$encryptedpasswordhashhere'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Supervisor',
          username: 'jsuper',
          password: 'superSecretPassword'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.username).toEqual('jsuper');
      expect(res.body.data.name).toEqual('John Supervisor');
    });

    it('should return 400 if credentials are incomplete', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'jsuper'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail if supervisor username is already registered', async () => {
      User.findOne.mockResolvedValue({ id: 'existing-id' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Supervisor',
          username: 'jsuper',
          password: 'superSecretPassword'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('username already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login supervisor and return JWT with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('superSecretPassword', 10);
      
      User.findOne.mockResolvedValue({
        id: 'test-uuid-12345',
        name: 'John Supervisor',
        username: 'jsuper',
        password: hashedPassword
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'jsuper',
          password: 'superSecretPassword'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    });

    it('should reject login for invalid credentials', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'jsuper',
          password: 'wrongPassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid username');
    });
  });
});
