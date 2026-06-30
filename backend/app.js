const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*', // Adjust for specific origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint
app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'SafeSphere API server is running and healthy'
  });
});

// Hook up API routes
app.use('/api', apiRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred'
  });
});

module.exports = app;
