import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ConversationManager } from './conversation/ConversationManager';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const WEB_DEV_BACKEND_URL = process.env.WEB_DEV_BACKEND_URL || 'http://localhost:3000';
const ANALYTICS_BACKEND_URL = process.env.ANALYTICS_BACKEND_URL || 'http://localhost:5001';
const MARKETING_BACKEND_URL = process.env.MARKETING_BACKEND_URL || 'http://localhost:5002';
const WEBSITE_ANALYTICS_BACKEND_URL = process.env.WEBSITE_ANALYTICS_BACKEND_URL || 'http://localhost:5003';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Initialize Conversation Manager
const conversationManager = new ConversationManager(ANTHROPIC_API_KEY);

app.get('/', (req, res) => {
  res.json({
    message: 'GeekQuote Controller Backend',
    version: '2.0.0',
    services: {
      webDevelopment: WEB_DEV_BACKEND_URL,
      businessAnalytics: ANALYTICS_BACKEND_URL,
      marketing: MARKETING_BACKEND_URL,
      websiteAnalytics: WEBSITE_ANALYTICS_BACKEND_URL
    },
    features: {
      smartConversations: true,
      intentClassification: true,
      requirementsGathering: true
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// NEW: Smart conversation endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { conversationId, message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await conversationManager.handleMessage({
      conversationId,
      message,
      userId
    });

    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: error.message 
    });
  }
});

// NEW: Get conversation history
app.get('/api/conversation/:id', (req, res) => {
  const { id } = req.params;
  const conversation = conversationManager.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  res.json(conversation);
});

// NEW: List all conversations (for admin/debugging)
app.get('/api/conversations', (req, res) => {
  const conversations = conversationManager.getAllConversations();
  res.json({
    total: conversations.length,
    conversations: conversations.map(c => ({
      conversationId: c.conversationId,
      messageCount: c.messages.length,
      problemType: c.metadata.problemType,
      createdAt: c.metadata.createdAt,
      updatedAt: c.metadata.updatedAt
    }))
  });
});

// Existing proxy routes (unchanged)

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
  console.log(`🎮 Controller Backend v2.0 on port ${port}`);
  console.log(`===========================================`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`💬 Smart Chat: http://localhost:${port}/api/chat`);
  console.log(`🔀 Web Dev: http://localhost:${port}/api/web-dev`);
  console.log(`📊 Business Analytics: http://localhost:${port}/api/ai-analytics`);
  console.log(`📣 Marketing: http://localhost:${port}/api/marketing`);
  console.log(`📈 Website Analytics: http://localhost:${port}/api/website-analytics`);
  console.log(`===========================================\n`);
});
