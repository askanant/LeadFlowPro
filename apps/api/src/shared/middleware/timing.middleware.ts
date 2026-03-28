import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

/**
 * Timing middleware - tracks request duration and logs slow requests
 * Logs requests that take longer than 5 seconds
 */
export function timingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  (req as any).startTime = startTime;

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log slow requests (> 5 seconds)
    if (duration > 5000) {
      LoggerService.warn({
        id: (req as any).id,
        code: 'SLOW_REQUEST',
        message: `Slow request: ${req.method} ${req.path}`,
        statusCode: res.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip || '',
        duration,
        userId: (req as any).auth?.userId,
        tenantId: (req as any).auth?.tenantId,
      });
    }
  });

  next();
}
