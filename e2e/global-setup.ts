import { execSync } from 'child_process';

/**
 * Playwright global setup - seeds the test database with required test users
 * before running e2e tests.
 */
export default function globalSetup() {
  console.log('\n🌱 Seeding test users for E2E tests...');
  try {
    execSync('npm -w apps/api run seed:test-user', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Test users seeded successfully\n');
  } catch (error) {
    console.warn('⚠️  Test user seeding failed - tests may fail due to missing users');
    console.warn('   Run manually: npm -w apps/api run seed:test-user\n');
  }
}
