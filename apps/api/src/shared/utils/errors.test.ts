import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from './errors';

describe('AppError', () => {
  it('creates error with code, message and default status 400', () => {
    const err = new AppError('INVALID', 'Invalid input');
    expect(err.code).toBe('INVALID');
    expect(err.message).toBe('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('accepts custom status code', () => {
    const err = new AppError('RATE_LIMIT', 'Too many requests', 429);
    expect(err.statusCode).toBe(429);
  });
});

describe('NotFoundError', () => {
  it('creates 404 error with resource name', () => {
    const err = new NotFoundError('Lead');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Lead not found');
    expect(err.statusCode).toBe(404);
  });
});

describe('UnauthorizedError', () => {
  it('creates 401 error with default message', () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
    expect(err.statusCode).toBe(401);
  });

  it('accepts custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('creates 403 error', () => {
    const err = new ForbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.statusCode).toBe(403);
  });
});

describe('ConflictError', () => {
  it('creates 409 error with message', () => {
    const err = new ConflictError('Email already exists');
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Email already exists');
    expect(err.statusCode).toBe(409);
  });
});
