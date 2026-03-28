/**
 * Utility for handling tenant filtering based on user role
 * Super Admin sees all tenants, regular users see only their tenant
 */

export function getTenantFilter(tenantId: string, role?: string) {
  /**
   * Returns a Prisma where clause based on role:
   * - Super Admin: {} (no filter, see all tenants)
   * - Regular user: { tenantId } (filter by tenant)
   */
  return role === 'super_admin' ? {} : { tenantId };
}

export function getTenantIdForQuery(tenantId: string, role?: string): string | null {
  /**
   * For raw SQL queries that need tenant_id
   * Returns tenantId if regular user, null if Super Admin (to indicate no filtering needed)
   */
  return role === 'super_admin' ? null : tenantId;
}

export function buildTenantWhereClause(baseClause: any, tenantId: string, role?: string) {
  /**
   * Merges a base where clause with tenant filtering
   */
  const tenantFilter = getTenantFilter(tenantId, role);
  return { ...baseClause, ...tenantFilter };
}
