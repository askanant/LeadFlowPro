import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import type { AuthPayload } from '../middleware/auth.middleware';

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
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
      socket.data.userId = payload.userId;
      socket.data.tenantId = payload.tenantId;
      socket.data.email = payload.email;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { tenantId, userId } = socket.data;

    // Join tenant-specific room for multi-tenant isolation
    socket.join(`tenant:${tenantId}`);
    // Join user-specific room for targeted notifications
    socket.join(`user:${userId}`);

    console.log(`WebSocket connected: user=${userId} tenant=${tenantId}`);

    socket.on('disconnect', () => {
      console.log(`WebSocket disconnected: user=${userId}`);
    });
  });

  console.log('🔌 WebSocket server initialized');
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
