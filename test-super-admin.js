require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function testSuperAdmin() {
  try {
    // Check if there are any users
    const users = await prisma.user.findMany();
    console.log('Users in database:', users.length);

    // Check if there are any companies
    const companies = await prisma.company.findMany();
    console.log('Companies in database:', companies.length);

    // Check if there are any leads
    const leads = await prisma.lead.findMany();
    console.log('Leads in database:', leads.length);

    // Test tenant filtering
    const { getTenantFilter } = require('./apps/api/src/shared/utils/tenant-filter');

    console.log('Super admin filter:', getTenantFilter('test-tenant', 'super_admin'));
    console.log('Regular user filter:', getTenantFilter('test-tenant', 'company_admin'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSuperAdmin();