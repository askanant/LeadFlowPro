# Super Admin Unified Dashboard Implementation Plan

## Objective
Enable Super Admin to see **real-time aggregated data from ALL tenants** with automatic reflection of any changes across the entire platform.

## Core Pattern

### Tenant Filtering Utility (Created ✅)
```typescript
// src/shared/utils/tenant-filter.ts
getTenantFilter(tenantId, role) {
  return role === 'super_admin' ? {} : { tenantId };
}
```

### Service Layer Update Pattern

**BEFORE:**
```typescript
async list(tenantId: string, filters: {...}) {
  const where = { tenantId, ...filters };
  return prisma.lead.findMany({ where });
}
```

**AFTER:**
```typescript
async list(tenantId: string, role: string | undefined, filters: {...}) {
  const tenantFilter = getTenantFilter(tenantId, role);
  const where = { ...tenantFilter, ...filters };
  return prisma.lead.findMany({ where });
}
```

## Implementation Phases

### ✅ PHASE 1: COMPLETE (5 mins)
- [x] Create tenant-filter.ts utility
- [x] Update analytics.router.ts for role-based filtering
- [x] Update leads.router.ts to pass role to service
- [x] Create seed-superadmin.ts with test data
- [x] Update prisma.config.ts with seed config

### ⏳ PHASE 2: SERVICE LAYER (Priority - 2-3 hours)
Update these service files to accept `role` parameter:

**Critical (Used most):**
- [ ] leads.service.ts - ALL methods
- [ ] campaigns.service.ts - ALL methods
- [ ] analytics endpoints - Already done ✅

**Important:**
- [ ] companies.service.ts
- [ ] telephony.service.ts
- [ ] settings.service.ts
- [ ] billing.service.ts

### ⏳ PHASE 3: ROUTER VERIFICATION (30 mins)
Verify all routers pass `req.auth.role` to services:
- [x] leads.router.ts - DONE ✅
- [x] analytics.router.ts - DONE ✅
- [ ] campaigns.router.ts
- [ ] companies.router.ts
- [ ] telephony.router.ts
- [ ] settings.router.ts
- [ ] billing.router.ts

### ⏳ PHASE 4: TESTING & VERIFICATION (1 hour)

**Super Admin Tests:**
- Login as anantshukla@live.com (Super Admin, dev-tenant-local)
- Verify seeing data from ALL tenants
- Update a lead in one tenant → appears immediately
- Create campaign in different tenant → appears immediately

**Regular User Tests:**
- Login as Acme Corp user
- ONLY see Acme Corp data
- Changes in other tenants NOT visible

## Key Changes Made So Far

✅ **prisma.config.ts** - Added migrations.seed
✅ **seed-superadmin.ts** - 40 leads, 25 calls, 3 campaigns in dev-tenant-local
✅ **analytics.router.ts** - Full role-based filtering
✅ **leads.router.ts** - Passing role to service methods
✅ **tenant-filter.ts** - Utility for consistent filtering

## Next Action Items (In Order)

1. **Update leads.service.ts** (highest priority - used most)
   - Add `role: string | undefined` to ALL method signatures
   - Import { getTenantFilter } from tenant-filter.ts
   - Replace hardcoded `{ tenantId }` with `getTenantFilter(tenantId, role)`

2. **Update campaigns.service.ts** - Same pattern

3. **Update other services** - Roll through systematically

4. **Comprehensive testing** - Verify real-time reflection works

## Expected Result

**Super Admin Dashboard (anantshukla@live.com):**
- Sees ALL 40 leads (from dev-tenant-local)
- Sees ALL 3 campaigns 
- Sees ALL 25 calls
- When a lead is updated in any tenant → appears immediately in Super Admin view
- All filtering, sorting, pagination works across all tenants

**Regular User Dashboard (Acme Corp):**
- Only sees Acme Corp data
- Isolated view with no cross-tenant visibility

## Estimated Total Time to Complete
- Phase 1: ✅ 5 mins (Done)
- Phase 2: ⏳ 2-3 hours
- Phase 3: ⏳ 30 mins
- Phase 4: ⏳ 1 hour
- **TOTAL: ~4 hours**

---

**Status:** Phase 1 complete, ready to start Phase 2
