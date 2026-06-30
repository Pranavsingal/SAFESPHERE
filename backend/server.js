const http = require('http');
const app = require('./app');
const { connectMongo, connectMySQL } = require('./config/db');
const { syncMySQL } = require('./models/index');
const { initSocket } = require('./services/socketService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('Bootstrapping SafeSphere Backend Server...');

  // 1. Establish database connections
  await connectMongo();
  const mysqlConnected = await connectMySQL();

  // 2. Synchronize and seed MySQL schema if connected
  if (mysqlConnected) {
    await syncMySQL();
  }

  // 3. Create HTTP server from Express app
  const server = http.createServer(app);

  // 4. Attach Socket.io WebSocket engine
  initSocket(server);
  console.log('WebSocket socket server initialized successfully');

  // 5. Start listening
  server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` SafeSphere Backend active on port ${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api`);
    console.log(` Health Check: http://localhost:${PORT}/health`);
    console.log(` WebSocket: ws://localhost:${PORT}`);
    console.log(`===================================================`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start SafeSphere API server:', error.message);
  process.exit(1);
});
