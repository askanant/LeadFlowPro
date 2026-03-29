import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

vi.mock('../../config', () => ({
  config: { NODE_ENV: 'development' },
}));

import { csrfProtection, generateCsrfToken, setCsrfCookie, clearCsrfCookie } from './csrf.middleware';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/',
    cookies: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { statusCode: number; body: any } {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  return res;
}

describe('CSRF Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  describe('generateCsrfToken', () => {
    it('returns a 64-character hex string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates unique tokens', () => {
      const t1 = generateCsrfToken();
      const t2 = generateCsrfToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('setCsrfCookie', () => {
    it('sets cookie with correct options', () => {
      const res = mockRes();
      setCsrfCookie(res, 'test-token');
      expect(res.cookie).toHaveBeenCalledWith('csrf-token', 'test-token', expect.objectContaining({
        httpOnly: false,
        path: '/',
      }));
    });
  });

  describe('clearCsrfCookie', () => {
    it('clears the csrf cookie', () => {
      const res = mockRes();
      clearCsrfCookie(res);
      expect(res.clearCookie).toHaveBeenCalledWith('csrf-token', expect.any(Object));
    });
  });

  describe('csrfProtection', () => {
    it('skips GET requests', () => {
      const req = mockReq({ method: 'GET' });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('skips HEAD requests', () => {
      const req = mockReq({ method: 'HEAD' });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('skips OPTIONS requests', () => {
      const req = mockReq({ method: 'OPTIONS' });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('skips webhook paths', () => {
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/webhooks/stripe',
        cookies: { accessToken: 'some-jwt' },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('skips health endpoint', () => {
      const req = mockReq({
        method: 'POST',
        path: '/health',
        cookies: { accessToken: 'some-jwt' },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('skips when no accessToken cookie (non-cookie auth)', () => {
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/leads',
        cookies: {},
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects POST when CSRF tokens are missing', () => {
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/leads',
        cookies: { accessToken: 'jwt-token' },
        headers: {},
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('CSRF');
    });

    it('rejects POST when tokens do not match', () => {
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/leads',
        cookies: { accessToken: 'jwt-token', 'csrf-token': 'token-a' },
        headers: { 'x-csrf-token': 'token-b' },
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('allows POST when CSRF tokens match', () => {
      const token = generateCsrfToken();
      const req = mockReq({
        method: 'POST',
        path: '/api/v1/leads',
        cookies: { accessToken: 'jwt-token', 'csrf-token': token },
        headers: { 'x-csrf-token': token },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('validates PATCH requests', () => {
      const req = mockReq({
        method: 'PATCH',
        path: '/api/v1/leads/123',
        cookies: { accessToken: 'jwt', 'csrf-token': 'aaa' },
        headers: { 'x-csrf-token': 'bbb' },
      });
      const res = mockRes();
      csrfProtection(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('validates DELETE requests', () => {
      const token = generateCsrfToken();
      const req = mockReq({
        method: 'DELETE',
        path: '/api/v1/leads/123',
        cookies: { accessToken: 'jwt', 'csrf-token': token },
        headers: { 'x-csrf-token': token },
      });
      csrfProtection(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
