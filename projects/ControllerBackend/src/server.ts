import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ConversationManager } from './conversation/ConversationManager';
import { sendContactEmail, ContactFormData } from './services/emailService';
import { logger } from './utils/logger';
import { toErrorMessage } from './utils/errors';

dotenv.config();

const app = express();
app.disable('x-powered-by');
const port = process.env.PORT || 4000;

app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'https://geekatyourspot.com,https://www.geekatyourspot.com,http://localhost:4200').split(','),
}));
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
      requirementsGathering: true,
      emailNotifications: true
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// NEW: Email endpoint
app.post('/api/email', async (req, res) => {
  try {
    const { name, email, message, phone, company, service } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, message'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
    if (emailRegex.exec(email) === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    // Prepare contact data
    const contactData: ContactFormData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      phone: phone?.trim(),
      company: company?.trim(),
    };

    // If service field exists, prepend it to the message
    if (service) {
      contactData.message = `Service: ${service}\n\n${contactData.message}`;
    }

    // Send email
    const result = await sendContactEmail(contactData);

    res.json({
      success: true,
      message: 'Email sent successfully',
      id: result.id
    });
  } catch (error: unknown) {
    logger.error('Email endpoint error', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again.',
      error: toErrorMessage(error)
    });
  }
});

// Smart conversation endpoint
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
  } catch (error: unknown) {
    logger.error('Chat error', { error });
    res.status(500).json({
      error: 'Failed to process message',
      message: toErrorMessage(error)
    });
  }
});

// Get conversation history
app.get('/api/conversation/:id', (req, res) => {
  const { id } = req.params;
  const conversation = conversationManager.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  res.json(conversation);
});

// List all conversations (for admin/debugging)
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

// Proxy routes

function buildProxyUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  const url = new URL(path, base.origin);
  if (url.origin !== base.origin) {
    throw new Error(`URL origin mismatch: expected ${base.origin}, got ${url.origin}`);
  }
  return url.href;
}

// Proxy to WebDevelopmentBackend
app.use('/api/web-dev', async (req, res) => {
  try {
    const url = buildProxyUrl(WEB_DEV_BACKEND_URL, req.path);
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Proxy error (web-dev)', { error });
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
    const url = buildProxyUrl(ANALYTICS_BACKEND_URL, targetPath);
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Proxy error (ai-analytics)', { error });
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
    const url = buildProxyUrl(MARKETING_BACKEND_URL, targetPath);
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Proxy error (marketing)', { error });
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
    const url = buildProxyUrl(WEBSITE_ANALYTICS_BACKEND_URL, targetPath);
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Proxy error (website-analytics)', { error });
    res.status(500).json({ error: 'Failed to proxy website analytics request' });
  }
});

app.listen(port, () => {
  logger.info('Controller Backend v2.0 started', {
    port,
    endpoints: {
      health: `http://localhost:${port}/health`,
      email: `http://localhost:${port}/api/email`,
      chat: `http://localhost:${port}/api/chat`,
      webDev: `http://localhost:${port}/api/web-dev`,
      businessAnalytics: `http://localhost:${port}/api/ai-analytics`,
      marketing: `http://localhost:${port}/api/marketing`,
      websiteAnalytics: `http://localhost:${port}/api/website-analytics`
    }
  });
});
