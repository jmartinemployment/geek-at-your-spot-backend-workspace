import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ContentService } from './services/ContentService';
import { SEOService } from './services/SEOService';

dotenv.config();

const app = express();
const port = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY is required');
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
  } catch (error: any) {
    console.error('Content generation error:', error);
    res.status(500).json({ 
      error: 'Content generation failed',
      message: error.message 
    });
  }
});

// SEO analysis
app.post('/api/marketing/seo', async (req: Request, res: Response) => {
  try {
    const result = await seoService.analyzeSEO(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('SEO analysis error:', error);
    res.status(500).json({ 
      error: 'SEO analysis failed',
      message: error.message 
    });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`\n===========================================`);
  console.log(`📣 Marketing Backend on port ${port}`);
  console.log(`===========================================`);
  console.log(`📡 Health: http://localhost:${port}/health`);
  console.log(`✍️  Content: http://localhost:${port}/api/marketing/content`);
  console.log(`🔍 SEO: http://localhost:${port}/api/marketing/seo`);
  console.log(`===========================================\n`);
});
