import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AnalyticsService } from './analytics/AnalyticsService';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY is required');
  process.exit(1);
}

const analyticsService = new AnalyticsService(ANTHROPIC_API_KEY);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Business Analytics Backend',
    version: '1.0.0'
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/analytics/revenue', async (req: Request, res: Response) => {
  try {
    const result = await analyticsService.analyzeData({
      type: 'revenue',
      timeRange: req.body.timeRange,
      data: req.body.data
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(port, () => {
  console.log(`\nServer running on port ${port}\n`);
});

// Keep alive
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
