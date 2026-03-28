import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production
 * Adds HSTS (HTTP Strict-Transport-Security) header
 */
export function httpsEnforcement(req: Request, res: Response, next: NextFunction) {
  // In production, enforce HTTPS
  if (config.NODE_ENV === 'production') {
    const proto = req.header('x-forwarded-proto') || 'http';
    
    if (proto !== 'https') {
      const host = req.header('host');
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }

  // Add HSTS header to enforce HTTPS for future requests
  // max-age: 31536000 = 1 year
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  next();
}
