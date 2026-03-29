vi.mock('../../config', () => ({
  config: { NODE_ENV: 'development', JWT_SECRET: 'test' },
}));

vi.mock('../services/logger.service', () => ({
  LoggerService: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { describe, it, expect, vi } from 'vitest';
import { errorMiddleware } from './error.middleware';
import { AppError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { ZodError } from 'zod';

function mockReqRes() {
  const req: any = { path: '/test', method: 'GET', ip: '127.0.0.1', get: vi.fn() };
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  const next = vi.fn();
  return { req, res, next };
}

describe('errorMiddleware', () => {
  it('handles AppError with correct status and code', () => {
    const { req, res, next } = mockReqRes();
    const err = new AppError('BAD_INPUT', 'Invalid data', 400);
    errorMiddleware(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'BAD_INPUT', message: 'Invalid data' },
      })
    );
  });

  it('handles NotFoundError as 404', () => {
    const { req, res, next } = mockReqRes();
    errorMiddleware(new NotFoundError('Lead'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('handles UnauthorizedError as 401', () => {
    const { req, res, next } = mockReqRes();
    errorMiddleware(new UnauthorizedError(), req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('handles ZodError as 422 with validation details', () => {
    const { req, res, next } = mockReqRes();
    const zodErr = ZodError.create([
      { code: 'invalid_type', expected: 'string', received: 'number', path: ['email'], message: 'Expected string' },
    ]);
    errorMiddleware(zodErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
  });

  it('handles Prisma unique constraint (P2002) as 409', () => {
    const { req, res, next } = mockReqRes();
    const prismaErr: any = new Error('Unique constraint');
    prismaErr.code = 'P2002';
    errorMiddleware(prismaErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('handles Prisma not found (P2025) as 404', () => {
    const { req, res, next } = mockReqRes();
    const prismaErr: any = new Error('Record not found');
    prismaErr.code = 'P2025';
    errorMiddleware(prismaErr, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('handles unknown errors as 500', () => {
    const { req, res, next } = mockReqRes();
    errorMiddleware(new Error('Something broke'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
  });
});
