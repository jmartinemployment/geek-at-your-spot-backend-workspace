// ============================================
// src/middleware/security.ts
// Security Middleware for API Protection
// ============================================

import { Request, Response, NextFunction } from 'express';

/**
 * Check API Key Authentication
 */
export const checkApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!apiKey) {
    res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
    return;
  }

  if (apiKey !== validApiKey) {
    res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
    return;
  }

  next();
};

/**
 * IP Whitelist Check (for admin endpoints)
 */
export const checkIPWhitelist = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];

  // If no IPs configured, allow all (for development)
  if (allowedIPs.length === 0 || allowedIPs[0] === '') {
    console.warn('⚠️  IP whitelist not configured - allowing all IPs');
    next();
    return;
  }

  const clientIP = (
    req.headers['x-forwarded-for'] as string ||
    req.socket.remoteAddress ||
    req.ip
  )?.split(',')[0].trim();

  if (!clientIP || !allowedIPs.includes(clientIP)) {
    console.warn(`🚫 Blocked IP: ${clientIP}`);
    res.status(403).json({
      error: 'Access denied',
      code: 'IP_NOT_ALLOWED'
    });
    return;
  }

  console.log(`✅ Allowed IP: ${clientIP}`);
  next();
};

/**
 * Request Logger Middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

  console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);

  next();
};

/**
 * Error Handler Middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('❌ Error:', error);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDevelopment && { details: error.message, stack: error.stack })
  });
};

/**
 * Validate Request Body
 */
export const validateChatRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { messages, leadInfo } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({
      error: 'Invalid request: messages array required',
      code: 'INVALID_REQUEST'
    });
    return;
  }

  if (messages.length === 0) {
    res.status(400).json({
      error: 'Invalid request: messages array cannot be empty',
      code: 'INVALID_REQUEST'
    });
    return;
  }

  // Validate message structure
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      res.status(400).json({
        error: 'Invalid message format: role and content required',
        code: 'INVALID_MESSAGE'
      });
      return;
    }

    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      res.status(400).json({
        error: 'Invalid message role',
        code: 'INVALID_MESSAGE'
      });
      return;
    }
  }

  next();
};
