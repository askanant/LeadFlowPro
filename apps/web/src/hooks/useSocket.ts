import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

let globalSocket: Socket | null = null;

function getSocket(token: string): Socket {
  if (globalSocket?.connected) return globalSocket;
  globalSocket?.disconnect();
  globalSocket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });
  return globalSocket;
}

export function useSocket(): Socket | null {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      globalSocket?.disconnect();
      globalSocket = null;
      socketRef.current = null;
      return;
    }

    const socket = getSocket(token);
    socketRef.current = socket;

    if (!socket.connected) socket.connect();

    return () => {
      // Don't disconnect on unmount — keep the global connection alive
    };
  }, [token, isAuthenticated]);

  return socketRef.current;
}
