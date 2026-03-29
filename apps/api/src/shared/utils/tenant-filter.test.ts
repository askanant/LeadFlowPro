import { describe, it, expect } from 'vitest';
import { getTenantFilter, getTenantIdForQuery, buildTenantWhereClause } from './tenant-filter';

const TENANT = 'tenant-123';

describe('getTenantFilter', () => {
  it('returns empty object for super_admin', () => {
    expect(getTenantFilter(TENANT, 'super_admin')).toEqual({});
  });

  it('returns tenantId filter for regular user', () => {
    expect(getTenantFilter(TENANT, 'company_admin')).toEqual({ tenantId: TENANT });
  });

  it('returns tenantId filter when role is undefined', () => {
    expect(getTenantFilter(TENANT)).toEqual({ tenantId: TENANT });
  });
});

describe('getTenantIdForQuery', () => {
  it('returns null for super_admin', () => {
    expect(getTenantIdForQuery(TENANT, 'super_admin')).toBeNull();
  });

  it('returns tenantId for regular user', () => {
    expect(getTenantIdForQuery(TENANT, 'viewer')).toBe(TENANT);
  });
});

describe('buildTenantWhereClause', () => {
  it('merges base clause with tenant filter', () => {
    const base = { status: 'active' };
    expect(buildTenantWhereClause(base, TENANT, 'viewer')).toEqual({
      status: 'active',
      tenantId: TENANT,
    });
  });

  it('does not add tenantId for super_admin', () => {
    const base = { status: 'active' };
    const result = buildTenantWhereClause(base, TENANT, 'super_admin');
    expect(result).toEqual({ status: 'active' });
    expect(result).not.toHaveProperty('tenantId');
  });
});
