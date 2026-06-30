const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SafeSphere API',
      version: '1.0.0',
      description: 'API Documentation for SafeSphere - AI-Powered Predictive Worker Safety Platform',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format "Bearer <token>"'
        },
      },
    },
  },
  // Parse JSDoc comments in route files for API documentation
  apis: [
    path.join(__dirname, '../routes/*.js').replace(/\\/g, '/')
  ]
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  // Serve interactive Swagger UI documentation page
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Provide raw OpenAPI JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = setupSwagger;
