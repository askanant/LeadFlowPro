import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/** Extract IP from request and pass to ipKeyGenerator */
function getIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Global rate limiter: 1000 requests per 15 minutes per IP
 * Applies to all requests unless overridden by specific limiters
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests from this IP address, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req: Request) => getIp(req),
  skip: (req: Request) => {
    // Skip rate limiting for health checks and webhooks
    return req.path === '/health' || req.path?.startsWith('/webhooks');
  },
});

/**
 * Auth rate limiter: 5 login attempts per 15 minutes per email + IP
 * Prevents brute force attacks on login endpoint
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV !== 'production' ? 1000 : 5, // 5 attempts per window (relaxed in non-production)
  message: 'Too many login attempts, please try again later.',
  keyGenerator: (req: Request) => {
    // Use email + IP as the rate limit key
    const email = req.body?.email || 'unknown';
    return `${email}-${getIp(req)}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration rate limiter: 3 new accounts per hour per IP
 * Prevents spam account creation
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per window
  message: 'Too many accounts created from this IP address, please try again later.',
  keyGenerator: (req: Request) => getIp(req),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API rate limiter: 100 requests per minute for authenticated users
 * 20 requests per minute for unauthenticated users
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => {
    // Allow 100 req/min for authenticated users, 20 for others
    return req.auth?.userId ? 100 : 20;
  },
  message: 'Too many requests, please try again later.',
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated requests, IP for others
    return req.auth?.userId || getIp(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip GET requests (less restrictive)
    return req.method === 'GET';
  },
});

/**
 * Webhook rate limiter: 10,000 requests per hour
 * For heavy hitters like Meta, Stripe, Google
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10000,
  message: 'Webhook rate limit exceeded',
  keyGenerator: (req: Request) => {
    // Rate limit by webhook source
    const source = req.headers['x-webhook-source'] || getIp(req);
    return `webhook-${source}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict limiter for sensitive endpoints: 10 requests per minute
 * For operations like password changes, credential updates, etc.
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many sensitive operations, please try again later.',
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated requests, IP for others
    return req.auth?.userId || getIp(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
});
