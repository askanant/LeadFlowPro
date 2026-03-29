import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../database/prisma';
import type { AuthPayload } from '../middleware/auth.middleware';
import { LoggerService } from '../services/logger.service';

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.NODE_ENV === 'development' ? '*' : process.env['FRONTEND_URL'],
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // JWT authentication middleware for WebSocket handshake
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
      
      // CRITICAL SECURITY FIX: Verify user exists in database and belongs to claimed tenantId
      // This prevents attackers from forging JWT tokens with arbitrary tenantIds
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, tenantId: true, role: true, isActive: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        return next(new Error('User account is inactive'));
      }

      // Verify the JWT tenantId matches the database tenantId
      if (user.tenantId !== payload.tenantId) {
        LoggerService.logWarn(`SECURITY: WebSocket authentication attempted with mismatched tenantId. userId=${payload.userId} jwtTenantId=${payload.tenantId} dbTenantId=${user.tenantId}`);
        return next(new Error('Tenant authorization failed'));
      }

      socket.data.userId = payload.userId;
      socket.data.tenantId = user.tenantId;  // Use database value, not JWT
      socket.data.email = payload.email;
      socket.data.role = user.role;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new Error('Invalid or expired token'));
      }
      if (error instanceof jwt.TokenExpiredError) {
        return next(new Error('Token expired'));
      }
      // Database or other errors
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { tenantId, userId } = socket.data;

    // Join tenant-specific room for multi-tenant isolation
    socket.join(`tenant:${tenantId}`);
    // Join user-specific room for targeted notifications
    socket.join(`user:${userId}`);

    LoggerService.logInfo(`WebSocket connected: user=${userId} tenant=${tenantId}`);

    socket.on('disconnect', () => {
      LoggerService.logInfo(`WebSocket disconnected: user=${userId}`);
    });
  });

  LoggerService.logInfo('WebSocket server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 * Returns null if WebSocket hasn't been initialized.
 */
export function getIO(): SocketIOServer | null {
  return io;
}

// ─── Emit helpers (safe — no-op if io not initialized) ──────────────────────

/** Emit to all users in a tenant */
export function emitToTenant(tenantId: string, event: string, data: unknown) {
  io?.to(`tenant:${tenantId}`).emit(event, data);
}

/** Emit to a specific user */
export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}
