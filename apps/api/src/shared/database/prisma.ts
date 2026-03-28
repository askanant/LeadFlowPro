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

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
