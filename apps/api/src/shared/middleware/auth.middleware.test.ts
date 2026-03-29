import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, AuthPayload } from './auth.middleware';

vi.mock('../../config', () => ({
  config: { JWT_SECRET: 'test-secret-key-for-unit-tests' },
}));

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

const testPayload: AuthPayload = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  email: 'test@example.com',
  role: 'company_admin',
};

function signToken(payload: object, secret = 'test-secret-key-for-unit-tests'): string {
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

describe('Auth Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  describe('requireAuth', () => {
    it('throws UnauthorizedError when no token is provided', () => {
      const req = mockReq();
      expect(() => requireAuth(req, mockRes(), next)).toThrowError('No token provided');
      expect(next).not.toHaveBeenCalled();
    });

    it('accepts token from httpOnly cookie', () => {
      const token = signToken(testPayload);
      const req = mockReq({ cookies: { accessToken: token } });
      requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
      expect(req.auth.userId).toBe('user-1');
      expect(req.auth.tenantId).toBe('tenant-1');
    });

    it('accepts token from Authorization header', () => {
      const token = signToken(testPayload);
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
      expect(req.auth.email).toBe('test@example.com');
    });

    it('prefers cookie over Authorization header', () => {
      const cookiePayload = { ...testPayload, email: 'cookie@test.com' };
      const headerPayload = { ...testPayload, email: 'header@test.com' };
      const req = mockReq({
        cookies: { accessToken: signToken(cookiePayload) },
        headers: { authorization: `Bearer ${signToken(headerPayload)}` },
      });
      requireAuth(req, mockRes(), next);
      expect(req.auth.email).toBe('cookie@test.com');
    });

    it('throws UnauthorizedError for invalid token', () => {
      const req = mockReq({ cookies: { accessToken: 'not.a.valid.jwt' } });
      expect(() => requireAuth(req, mockRes(), next)).toThrowError('Invalid or expired token');
    });

    it('throws UnauthorizedError for token signed with wrong secret', () => {
      const token = jwt.sign(testPayload, 'wrong-secret', { expiresIn: '15m' });
      const req = mockReq({ cookies: { accessToken: token } });
      expect(() => requireAuth(req, mockRes(), next)).toThrowError('Invalid or expired token');
    });

    it('throws UnauthorizedError for expired token', () => {
      const token = jwt.sign(testPayload, 'test-secret-key-for-unit-tests', { expiresIn: '-1s' });
      const req = mockReq({ cookies: { accessToken: token } });
      expect(() => requireAuth(req, mockRes(), next)).toThrowError('Invalid or expired token');
    });

    it('ignores Authorization header without Bearer prefix', () => {
      const token = signToken(testPayload);
      const req = mockReq({ headers: { authorization: `Token ${token}` } });
      expect(() => requireAuth(req, mockRes(), next)).toThrowError('No token provided');
    });
  });

  describe('requireRole', () => {
    it('passes when user has required role', () => {
      const req = mockReq() as Request;
      req.auth = testPayload;
      const middleware = requireRole('company_admin');
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('passes when user role is in allowed list', () => {
      const req = mockReq() as Request;
      req.auth = { ...testPayload, role: 'super_admin' };
      const middleware = requireRole('company_admin', 'super_admin');
      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('throws when user role is not in allowed list', () => {
      const req = mockReq() as Request;
      req.auth = { ...testPayload, role: 'viewer' };
      const middleware = requireRole('company_admin', 'super_admin');
      expect(() => middleware(req, mockRes(), next)).toThrowError('Insufficient permissions');
    });
  });
});
