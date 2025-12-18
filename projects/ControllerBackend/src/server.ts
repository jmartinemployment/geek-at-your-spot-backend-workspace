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
const MARKETING_BACKEND_URL = process.env.MARKETING_BACKEND_URL || 'http://localhost:5002';
const WEBSITE_ANALYTICS_BACKEND_URL = process.env.WEBSITE_ANALYTICS_BACKEND_URL || 'http://localhost:5003';

app.get('/', (req, res) => {
  res.json({
    message: 'GeekQuote Controller Backend',
    version: '1.0.0',
    services: {
      webDevelopment: WEB_DEV_BACKEND_URL,
      businessAnalytics: ANALYTICS_BACKEND_URL,
      marketing: MARKETING_BACKEND_URL,
      websiteAnalytics: WEBSITE_ANALYTICS_BACKEND_URL
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
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy request' });
  }
});

// Proxy to AIBusinessAnalyticsBackend  
app.use('/api/ai-analytics', async (req, res) => {
  try {
    // For /health, send to /health. For /revenue, send to /api/analytics/revenue
    let targetPath = req.path;
    if (req.path !== '/health' && !req.path.startsWith('/api/')) {
      targetPath = `/api/analytics${req.path}`;
    }
    const url = `${ANALYTICS_BACKEND_URL}${targetPath}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy analytics request' });
  }
});

// Proxy to MarketingBackend
app.use('/api/marketing', async (req, res) => {
  try {
    let targetPath = req.path;
    if (req.path !== '/health' && !req.path.startsWith('/api/')) {
      targetPath = `/api/marketing${req.path}`;
    }
    const url = `${MARKETING_BACKEND_URL}${targetPath}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy marketing request' });
  }
});

// Proxy to WebsiteAnalyticsBackend
app.use('/api/website-analytics', async (req, res) => {
  try {
    let targetPath = req.path;
    if (req.path !== '/health' && !req.path.startsWith('/api/')) {
      targetPath = `/api/analytics${req.path}`;
    }
    const url = `${WEBSITE_ANALYTICS_BACKEND_URL}${targetPath}`;
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy website analytics request' });
  }
});

app.listen(port, () => {
  console.log(`\n===========================================`);
  console.log(`🎮 Controller Backend on port ${port}`);
  console.log(`===========================================`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`🔀 Web Dev: http://localhost:${port}/api/web-dev`);
  console.log(`📊 Business Analytics: http://localhost:${port}/api/ai-analytics`);
  console.log(`📣 Marketing: http://localhost:${port}/api/marketing`);
  console.log(`📈 Website Analytics: http://localhost:${port}/api/website-analytics`);
  console.log(`===========================================\n`);
});
