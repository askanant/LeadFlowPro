import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../../config';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

// Methods that don't modify state — no CSRF check needed
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths that receive external webhooks (no browser cookies)
const EXEMPT_PREFIXES = ['/api/v1/webhooks/', '/health'];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set the CSRF cookie (non-httpOnly so the frontend JS can read it)
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by frontend JS
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clear the CSRF cookie on logout
 */
export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
}

/**
 * CSRF protection middleware (double-submit cookie pattern).
 * For state-changing requests (POST/PUT/PATCH/DELETE), validates that
 * the X-CSRF-Token header matches the csrf-token cookie.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip webhook endpoints (they use signature verification, not cookies)
  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  // If no auth cookie is present, this isn't a cookie-authenticated request — skip CSRF
  if (!req.cookies?.accessToken) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: 'CSRF token validation failed' });
    return;
  }

  next();
}
