import { PrismaClient, Prisma } from '@prisma/client';
export { Prisma };
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from '../../config';

// Use the pg driver adapter — no native .dll.node binary required.
// This works reliably on Windows including OneDrive paths.
const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const SLOW_QUERY_THRESHOLD_MS = 500;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: config.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }],
  });

// Monitor query performance — log slow queries in all environments
(prisma as any).$on?.('query', (e: { query: string; params: string; duration: number }) => {
  if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
    const { LoggerService } = require('../services/logger.service');
    LoggerService.logWarn(`Slow query detected (${e.duration}ms)`, {
      query: e.query.slice(0, 200),
      duration: e.duration,
      threshold: SLOW_QUERY_THRESHOLD_MS,
    });
  }
});

if (config.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
