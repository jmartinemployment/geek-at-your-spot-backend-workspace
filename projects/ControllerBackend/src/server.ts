import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const WEB_DEV_BACKEND_URL = process.env.WEB_DEV_BACKEND_URL || 'http://localhost:3000';
const ANALYTICS_BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:5001';

app.get('/', (req, res) => {
  res.json({
    message: 'GeekQuote Controller Backend',
    version: '1.0.0',
    services: {
      webDevelopment: WEB_DEV_BACKEND_URL,
      analytics: ANALYTICS_BACKEND_URL
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Proxy to WebDevelopmentBackend
app.use('/api/web-dev', async (req, res) => {
  try {
    const url = `${WEB_DEV_BACKEND_URL}${req.path}`;
    
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) 
        ? JSON.stringify(req.body) 
        : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Web Dev proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

// Proxy to AIBusinessAnalyticsBackend
app.use('/api/ai-analytics', async (req, res) => {
  try {
    // Replace /api/ai-analytics with /api/analytics for backend
    const path = req.path.replace(/^\//, '/api/analytics/');
    const url = `${ANALYTICS_BACKEND_URL}${path}`;
    
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) 
        ? JSON.stringify(req.body) 
        : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Analytics proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy analytics request' });
  }
});

app.listen(port, () => {
  console.log(`\n===========================================`);
  console.log(`🎮 Controller Backend on port ${port}`);
  console.log(`===========================================`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`🔀 Web Dev: http://localhost:${port}/api/web-dev`);
  console.log(`📊 Analytics: http://localhost:${port}/api/ai-analytics`);
  console.log(`===========================================\n`);
});
