import { prisma } from '../src/shared/database/prisma';
import { hash } from 'bcryptjs';

// Load environment variables
require('dotenv').config({ path: '../../.env' });

const { config } = require('../src/config');

/**
 * Development-only script to create or update a super admin user
 * Runs only when:
 * - NODE_ENV === 'development'
 * - DEV_SUPER_ADMIN_EMAIL is set in .env
 * - DEV_SUPER_ADMIN_PASSWORD is set in .env
 *
 * NEVER enable this in production!
 *
 * Usage:
 * npx ts-node scripts/create-dev-admin.ts
 */

async function createDevAdmin() {
  // Safety check: never run in production
  if (config.NODE_ENV === 'production') {
    console.error('ERROR: createDevAdmin cannot run in production!');
    process.exit(1);
  }

  const email = process.env['DEV_SUPER_ADMIN_EMAIL'];
  const password = process.env['DEV_SUPER_ADMIN_PASSWORD'];
  const tenantId = process.env['DEV_SUPER_ADMIN_TENANT_ID'] || 'dev-tenant-local';

  if (!email || !password) {
    console.log(
      'ℹ️  DEV_SUPER_ADMIN_EMAIL or DEV_SUPER_ADMIN_PASSWORD not set. Skipping dev admin creation.'
    );
    return;
  }

  try {
    console.log(`Creating dev super admin: ${email}`);

    // Check if company exists
    let company = await prisma.company.findUnique({
      where: { tenantId },
    });

    if (!company) {
      console.log(`Creating development tenant: ${tenantId}`);
      company = await prisma.company.create({
        data: {
          tenantId,
          name: 'Development Company',
          status: 'active',
          settings: {
            isDevelopment: true,
          },
        },
      });
      console.log(`✓ Development tenant created`);
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update existing user to super_admin
      user = await prisma.user.update({
        where: { email },
        data: {
          role: 'super_admin',
          passwordHash: hashedPassword,
          isActive: true,
        },
      });
      console.log(`✓ Updated ${email} to super_admin role`);
    } else {
      // Create new super admin user
      user = await prisma.user.create({
        data: {
          email,
          tenantId,
          role: 'super_admin',
          passwordHash: hashedPassword,
          firstName: 'Dev',
          lastName: 'Admin',
          isActive: true,
        },
      });
      console.log(`✓ Created super admin user: ${email}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DEV SUPER ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`TenantID: ${tenantId}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Error creating dev admin:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createDevAdmin()
    .then(() => {
      console.log('Dev admin setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createDevAdmin };
