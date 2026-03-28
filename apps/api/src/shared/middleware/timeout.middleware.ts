import { Request, Response, NextFunction } from 'express';

/**
 * Request timeout middleware
 * Returns 408 (Request Timeout) if request exceeds the specified duration
 * @param ms Timeout in milliseconds (default: 30000ms = 30s)
 */
export function requestTimeout(ms: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout - operation took too long'
          }
        });
      }
    }, ms);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}
