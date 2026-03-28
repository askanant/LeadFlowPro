import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Create tenant first
    const tenant = await prisma.company.upsert({
      where: { tenantId: 'dev-tenant-local' },
      update: {},
      create: {
        tenantId: 'dev-tenant-local',
        name: 'Development Tenant',
        status: 'active',
      }
    });
    
    console.log('✓ Tenant created:', tenant.tenantId);
    
    // Hash password
    const passwordHash = await hash('Admin@$1234!', 10);
    
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: 'anantshukla@live.com' },
      update: {
        passwordHash,
        role: 'super_admin',
        isActive: true,
      },
      create: {
        email: 'anantshukla@live.com',
        tenantId: 'dev-tenant-local',
        passwordHash,
        role: 'super_admin',
        firstName: 'Dev',
        lastName: 'Admin',
        isActive: true,
      }
    });
    
    console.log('✓ Admin user created/updated');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('DEV SUPER ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Email:    anantshukla@live.com');
    console.log('Password: Admin@$1234!');
    console.log('TenantID: dev-tenant-local');
    console.log('═══════════════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
