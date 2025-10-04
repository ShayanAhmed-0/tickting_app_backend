import app from "./app";
import { PORT } from "./config/environment";
import { createServer } from 'http';
import { createSocketServer } from './config/socket';
import { socketAuthMiddleware } from './middleware/socket-auth.middleware';
import SocketHandlers from './handlers/socket.handlers';

const SERVER_PORT = PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Create Socket.io server
const io = createSocketServer(server);

// Apply authentication middleware to Socket.io
io.use(socketAuthMiddleware);

// Initialize socket handlers
const socketHandlers = new SocketHandlers(io);
socketHandlers.initializeHandlers();

// Start server
server.listen(SERVER_PORT, () => {
  console.log(`🚀 Server running on port ${SERVER_PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});

export { io };
