import 'dotenv/config';
import http from 'http';
import app from './app.js';
import prisma from './prisma/client.js';
import { initSocket } from './socket.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database via Prisma');

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🔌 Socket.io initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// touch to restart