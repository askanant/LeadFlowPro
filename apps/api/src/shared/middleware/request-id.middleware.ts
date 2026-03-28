import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID middleware
 * Generates a unique request ID for each request and adds it to the response headers
 * Useful for tracing and logging
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Attach request ID to request object for use in handlers
  (req as any).id = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

// Extend Express Request type to include id property
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
