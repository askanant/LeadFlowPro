import { execSync } from 'child_process';

/**
 * Playwright global setup - seeds the test database with required test users
 * before running e2e tests.
 */
export default function globalSetup() {
  console.log('\n🌱 Seeding test users for E2E tests...');
  try {
    const output = execSync('npm -w apps/api run seed:test-user', {
      stdio: 'pipe',
      cwd: process.cwd(),
      timeout: 30000,
    });
    console.log(output.toString());
    console.log('✅ Test users seeded successfully\n');
  } catch (error: any) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    console.error('❌ Test user seeding FAILED');
    if (stderr.includes("Can't reach database server") || stdout.includes("Can't reach database server")) {
      console.error('   DATABASE_URL in apps/api/.env is unreachable.');
      console.error('   Ensure your database is running and the URL is correct.');
    }
    console.error('   STDERR:', stderr.slice(0, 500));
    console.error('   Run manually: npm -w apps/api run seed:test-user');
    console.error('   E2E tests will likely fail due to missing test users.\n');
  }
}
