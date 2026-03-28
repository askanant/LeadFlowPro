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
declare function createDevAdmin(): Promise<void>;
export { createDevAdmin };
