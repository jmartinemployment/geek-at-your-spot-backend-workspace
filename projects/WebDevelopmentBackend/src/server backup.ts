// ============================================
// src/server.ts
// Main Express Server Entry Point
// ============================================

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';

// Import middleware
import { requestLogger, errorHandler } from './middleware/security';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma
const prisma = new PrismaClient();

// ==========================================
// MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // Allow external scripts
}));

// CORS - Allow requests from your WordPress site
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://geekatyourspot.com',
  'http://localhost:4200',
  'http://localhost:3000',
  'https://geekatyourspot.com',
  'https://www.geekatyourspot.com'
];
console.log('🔍 Allowed Origins:', allowedOrigins);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));

// Rate limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// ==========================================
// ROUTES
// ==========================================

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version info
app.get('/api', (req, res) => {
  res.json({
    name: 'GeekQuote AI API',
    version: '1.0.0',
    endpoints: {
      chat: '/api/chat',
      admin: '/api/admin/*'
    }
  });
});

// Mount route handlers
app.use('/api', chatRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler - must come after all other routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ==========================================
// SERVER STARTUP
// ==========================================

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ==========================================');
      console.log('🚀  GeekQuote AI Backend Server');
      console.log('🚀 ==========================================');
      console.log(`🚀  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀  Port: ${PORT}`);
      console.log(`🚀  Health: http://localhost:${PORT}/health`);
      console.log(`🚀  API: http://localhost:${PORT}/api`);
      console.log('🚀 ==========================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

export default app;
