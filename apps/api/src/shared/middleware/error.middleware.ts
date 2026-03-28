import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { config } from '../../config';
import { LoggerService } from '../services/logger.service';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const startTime = (req as any).startTime || Date.now();
  const duration = Date.now() - startTime;
  const requestId = (req as any).id;

  let errorResponse = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };

  if (err instanceof AppError) {
    errorResponse.error = { code: err.code, message: err.message };

    LoggerService.log({
      id: requestId,
      level: err.statusCode >= 500 ? 'error' : 'warn',
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      userId: (req as any).auth?.userId,
      tenantId: (req as any).auth?.tenantId,
      path: req.path,
      method: req.method,
      ip: req.ip || '',
      userAgent: req.get('user-agent'),
      duration,
    });

    return res.status(err.statusCode).json(errorResponse);
  }

  if (err instanceof ZodError) {
    errorResponse.error = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
    };

    LoggerService.warn({
      id: requestId,
      code: 'VALIDATION_ERROR',
      message: `Validation failed: ${JSON.stringify(err.flatten().fieldErrors)}`,
      statusCode: 422,
      path: req.path,
      method: req.method,
      ip: req.ip || '',
      userId: (req as any).auth?.userId,
      tenantId: (req as any).auth?.tenantId,
      duration,
    });

    return res.status(422).json({
      ...errorResponse,
      details: err.flatten().fieldErrors,
    });
  }

  // Prisma unique constraint violation
  if ((err as any).code === 'P2002') {
    errorResponse.error = { code: 'CONFLICT', message: 'Resource already exists' };

    LoggerService.warn({
      id: requestId,
      code: 'CONFLICT',
      message: 'Unique constraint violation',
      statusCode: 409,
      path: req.path,
      method: req.method,
      ip: req.ip || '',
      userId: (req as any).auth?.userId,
      tenantId: (req as any).auth?.tenantId,
      duration,
    });

    return res.status(409).json(errorResponse);
  }

  // Prisma record not found
  if ((err as any).code === 'P2025') {
    errorResponse.error = { code: 'NOT_FOUND', message: 'Resource not found' };

    LoggerService.warn({
      id: requestId,
      code: 'NOT_FOUND',
      message: 'Record not found',
      statusCode: 404,
      path: req.path,
      method: req.method,
      ip: req.ip || '',
      userId: (req as any).auth?.userId,
      tenantId: (req as any).auth?.tenantId,
      duration,
    });

    return res.status(404).json(errorResponse);
  }

  // Unexpected errors
  LoggerService.error({
    id: requestId,
    code: 'UNHANDLED_ERROR',
    message: err.message,
    statusCode: 500,
    userId: (req as any).auth?.userId,
    tenantId: (req as any).auth?.tenantId,
    path: req.path,
    method: req.method,
    ip: req.ip || '',
    userAgent: req.get('user-agent'),
    duration,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return res.status(500).json(errorResponse);
}
