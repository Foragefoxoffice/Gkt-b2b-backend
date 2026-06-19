import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './prisma/client.js';

let io;
// Map to store connected users: userId -> socketId
const userSockets = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust this to your frontend URL in production
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { role: true }
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.name} (${socket.user.role?.name}) - Socket ID: ${socket.id}`);
    
    // Store socket id
    userSockets.set(socket.user.id, socket.id);

    // Join room based on role (useful for broadcasting to all admins)
    if (socket.user.role?.name) {
      socket.join(socket.user.role.name);
    }

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.name}`);
      userSockets.delete(socket.user.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit event to a specific user
 * @param {number} userId - The target user ID
 * @param {string} event - The event name
 * @param {any} data - The payload
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

/**
 * Emit event to all users with a specific role (e.g., 'ADMIN')
 * @param {string} roleName - The target role name
 * @param {string} event - The event name
 * @param {any} data - The payload
 */
export const emitToRole = (roleName, event, data) => {
  if (!io) return;
  io.to(roleName).emit(event, data);
};
