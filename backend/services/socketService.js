let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust to your front-end domain in production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Please call initSocket(server) first.');
  }
  return io;
};

// Send real-time health telemetry updates to dashboard
const broadcastHealthUpdate = (data) => {
  try {
    const activeIo = getIO();
    activeIo.emit('health-update', data);
  } catch (error) {
    // Gracefully handle if sockets aren't active in tests
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Socket broadcast warning:', error.message);
    }
  }
};

// Push urgent emergency/warning alerts to dashboard
const broadcastAlert = (alert) => {
  try {
    const activeIo = getIO();
    activeIo.emit('alert', alert);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Socket alert broadcast warning:', error.message);
    }
  }
};

module.exports = {
  initSocket,
  getIO,
  broadcastHealthUpdate,
  broadcastAlert
};
