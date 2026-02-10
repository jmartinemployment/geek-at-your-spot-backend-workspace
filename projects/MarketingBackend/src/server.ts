import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ContentService } from './services/ContentService';
import { SEOService } from './services/SEOService';
import { logger } from './utils/logger';
import { toErrorMessage } from './utils/errors';

dotenv.config();

const app = express();
app.disable('x-powered-by');
const port = process.env.PORT || 5002;

app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'https://geekatyourspot.com,https://www.geekatyourspot.com,http://localhost:4200').split(','),
}));
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

if (!ANTHROPIC_API_KEY) {
  logger.error('ANTHROPIC_API_KEY is required');
  process.exit(1);
}

const contentService = new ContentService(ANTHROPIC_API_KEY);
const seoService = new SEOService(ANTHROPIC_API_KEY);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Marketing Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      content: 'POST /api/marketing/content',
      seo: 'POST /api/marketing/seo'
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Marketing'
  });
});

// Generate content
app.post('/api/marketing/content', async (req: Request, res: Response) => {
  try {
    const result = await contentService.generateContent(req.body);
    res.json(result);
  } catch (error: unknown) {
    logger.error('Content generation error', { error });
    res.status(500).json({
      error: 'Content generation failed',
      message: toErrorMessage(error)
    });
  }
});

// SEO analysis
app.post('/api/marketing/seo', async (req: Request, res: Response) => {
  try {
    const result = await seoService.analyzeSEO(req.body);
    res.json(result);
  } catch (error: unknown) {
    logger.error('SEO analysis error', { error });
    res.status(500).json({
      error: 'SEO analysis failed',
      message: toErrorMessage(error)
    });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  logger.info(`Marketing Backend started on port ${port}`, {
    endpoints: {
      health: `http://localhost:${port}/health`,
      content: `http://localhost:${port}/api/marketing/content`,
      seo: `http://localhost:${port}/api/marketing/seo`
    }
  });
});
