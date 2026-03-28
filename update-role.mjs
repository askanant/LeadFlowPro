import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const user = await prisma.user.update({
  where: { email: 'admin@acme.test' },
  data: { role: 'super_admin' },
});
console.log('Updated user role to:', user.role);
await prisma.$disconnect();
await pool.end();
