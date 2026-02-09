// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now import everything else
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sendContactEmail, ContactFormData } from './emailService';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parser
app.use(express.json());

// Rate limiting: 5 requests per 15 minutes per IP
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many email requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
function validateContactForm(req: Request, res: Response, next: Function) {
  const { name, email, message } = req.body;

  // Required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'email', 'message'],
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.exec(email) === null) {
    return res.status(400).json({
      error: 'Invalid email address',
    });
  }

  // Length validation
  if (name.length > 100 || email.length > 100 || message.length > 5000) {
    return res.status(400).json({
      error: 'Field length exceeded',
      limits: { name: 100, email: 100, message: 5000 },
    });
  }

  next();
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Email endpoint
app.post('/api/email', emailLimiter, validateContactForm, async (req: Request, res: Response) => {
  try {
    const contactData: ContactFormData = {
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      message: req.body.message.trim(),
      phone: req.body.phone?.trim(),
      company: req.body.company?.trim(),
    };

    const result = await sendContactEmail(contactData);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      id: result.id,
    });
  } catch (error: unknown) {
    logger.error('Error in /api/email', { error });
    res.status(500).json({
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Email service started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    allowedOrigins: allowedOrigins.join(', ')
  });
});
