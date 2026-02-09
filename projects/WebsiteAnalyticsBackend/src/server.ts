import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TrafficAnalysisService } from './services/TrafficAnalysisService';
import { ConversionOptimizationService } from './services/ConversionOptimizationService';
import { logger } from './utils/logger';
import { toErrorMessage } from './utils/errors';

dotenv.config();

const app = express();
app.disable('x-powered-by');
const port = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

if (!ANTHROPIC_API_KEY) {
  logger.error('ANTHROPIC_API_KEY is required');
  process.exit(1);
}

const trafficService = new TrafficAnalysisService(ANTHROPIC_API_KEY);
const conversionService = new ConversionOptimizationService(ANTHROPIC_API_KEY);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Website Analytics Backend',
    version: '1.0.0'
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/analytics/traffic', async (req: Request, res: Response) => {
  try {
    const result = await trafficService.analyzeTraffic(req.body);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: toErrorMessage(error) });
  }
});

app.post('/api/analytics/conversion', async (req: Request, res: Response) => {
  try {
    const result = await conversionService.analyzeConversion(req.body);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: toErrorMessage(error) });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  logger.info(`Website Analytics Backend started on port ${port}`);
});
