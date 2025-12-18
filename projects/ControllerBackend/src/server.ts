import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const WEB_DEV_BACKEND_URL = process.env.WEB_DEV_BACKEND_URL || 'http://localhost:3000';

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GeekQuote Controller Backend',
    version: '1.0.0',
    services: {
      webDevelopment: WEB_DEV_BACKEND_URL
    },
    endpoints: {
      health: '/health',
      webDev: '/api/web-dev'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      controller: 'healthy',
      webDevelopment: 'connected'
    }
  });
});

// Proxy to WebDevelopmentBackend - catch all routes
app.use('/api/web-dev', async (req, res) => {
  try {
    const url = `${WEB_DEV_BACKEND_URL}${req.path}`;
    
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) 
        ? JSON.stringify(req.body) 
        : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(port, () => {
  console.log(`\n===========================================`);
  console.log(`🎮 Controller Backend running on port ${port}`);
  console.log(`===========================================`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`🔀 Proxy: http://localhost:${port}/api/web-dev`);
  console.log(`===========================================\n`);
});
