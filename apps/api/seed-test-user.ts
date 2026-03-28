import { prisma } from './src/shared/database/prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Creating test user for E2E tests...\n');

  const tenantId = 'dev-tenant-local';
  const testEmail = 'admin@acme.test';
  const testPassword = 'password';

  // Check if company exists
  let company = await prisma.company.findFirst({
    where: { tenantId },
  });

  if (!company) {
    console.log('📦 Creating default company...');
    company = await prisma.company.create({
      data: {
        tenantId,
        name: 'ACME Test Corp',
        industry: 'Technology',
        businessType: 'B2B SaaS',
        description: 'Test company for E2E testing',
        status: 'active',
        settings: { maxAgents: 10 },
      },
    });
    console.log(`✅ Created company: ${company.name}\n`);
  } else {
    console.log(`✅ Using existing company: ${company.name}\n`);
  }

  // Check if test user already exists
  let user = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (user) {
    console.log(`✅ Test user already exists: ${testEmail}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tenant: ${user.tenantId}`);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(testPassword, 12);

  // Create test user
  user = await prisma.user.create({
    data: {
      tenantId,
      email: testEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Test',
      role: 'company_admin',
    },
  });

  console.log(`✅ Created test user`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${testPassword}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Tenant: ${user.tenantId}`);
  console.log(`   ID: ${user.id}\n`);

  // Create test users for other scenarios
  const additionalUsers = [
    { email: 'sales1@acme.test', firstName: 'John', lastName: 'Sales', role: 'viewer' as const },
    { email: 'sales2@acme.test', firstName: 'Jane', lastName: 'Sales', role: 'viewer' as const },
  ];

  for (const userData of additionalUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`✅ User already exists: ${userData.email}`);
      continue;
    }

    const newUser = await prisma.user.create({
      data: {
        tenantId,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      },
    });

    console.log(`✅ Created user: ${newUser.email}`);
  }

  console.log('\n✨ Test user seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
