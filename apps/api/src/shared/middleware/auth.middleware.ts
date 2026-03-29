import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { UnauthorizedError } from '../utils/errors';

export interface AuthPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // Support both httpOnly cookie and Authorization header (for backward compatibility + WebSocket)
  let token: string | undefined;

  // Prefer httpOnly cookie
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else {
    // Fallback to Authorization header (WebSocket handshake, legacy clients)
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      token = header.slice(7);
    }
  }

  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.auth.role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }
    next();
  };
}
