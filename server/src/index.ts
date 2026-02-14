// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { prisma } from './prisma/client';
import authRoutes from './routes/auth';
import participantRoutes from './routes/participants';
import agentRoutes from './routes/agents';
import reinforcementRoutes from './routes/reinforcement';
import audioRoutes from './routes/audio';
import conversationRoutes from './routes/conversation';
import aiPatientRoutes from './routes/aiPatients';
import aiModeratorRoutes from './routes/aiModerator';
import cognitiveGameRoutes from './routes/cognitive-game';
import heygenRoutes from './routes/heygen';
import sessionsRoutes from './routes/sessions';
import { ConversationWebSocketHandler } from './websocket/handler';
import { AppError } from './types';

const app = express();

// Middleware
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'AI CST Platform API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/reinforcement', reinforcementRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/ai-patients', aiPatientRoutes);
app.use('/api/ai-moderator', aiModeratorRoutes);
app.use('/api/cognitive-game', cognitiveGameRoutes);
app.use('/api/heygen', heygenRoutes);
app.use('/api/sessions', sessionsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle other errors
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
const wsHandler = new ConversationWebSocketHandler(wss);

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  wsHandler.handleConnection(ws as any, request);
});

// Start server
const PORT = config.PORT;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
      console.log(`📝 Environment: ${config.NODE_ENV}`);
      console.log(`🌐 CORS enabled for: ${config.CLIENT_URL}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
