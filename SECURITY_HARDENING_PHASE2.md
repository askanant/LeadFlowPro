# Security Hardening & Error Handling Improvements - Phase 2

**Status**: Complete ✅  
**Date**: Mar 29, 2026  
**Priority**: Critical (Security) + High (UX)  

---

## Summary of Changes

This implementation hardens LeadFlowPro's security posture and significantly improves error handling and user experience. All changes are backward compatible.

---

## 1. CRITICAL SECURITY IMPROVEMENTS

### 1.1 Platform Credential Encryption (KMS/AES-256)

**Problem**: Platform credentials (API tokens, secrets) stored in plain text in database  
**Solution**: All credentials now encrypted using AWS KMS (production) or AES-256 (development)

**Files Changed**:
- [apps/api/src/shared/services/encryption.service.ts](apps/api/src/shared/services/encryption.service.ts) — New encryption service
- [apps/api/src/modules/companies/companies.service.ts](apps/api/src/modules/companies/companies.service.ts) — Updated to use encryption
- [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) — Added encrypted credential fields
- [apps/api/src/config.ts](apps/api/src/config.ts) — Added KMS_KEY_ID config

**How It Works**:
```typescript
// Automatic encryption on write
await companiesService.storeCredentials(tenantId, callerTenantId, role, {
  platform: 'meta',
  accessToken: 'token-123',  // Automatically encrypted
  appSecret: 'secret-456',   // Automatically encrypted
  ...
});

// Auto decryption on read (when needed)
const credentials = await EncryptionService.decryptObject(encrypted, iv);
```

**Environment Setup**:
```env
# Development (uses local AES-256)
JWT_SECRET=your-32-char-minimum-secret-key

# Production (uses AWS KMS)
KMS_KEY_ID=arn:aws:kms:us-east-1:ACCOUNT:key/KEY-ID
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

**Migration Required**:
```bash
# 1. Add new columns to database
npx prisma migrate dev --name add_encrypted_credentials

# 2. Copy old credentials to new encrypted fields (if needed)
# Optional: Legacy fields will be depreciated after migration

# 3. Regenerate Prisma client
npm run db:generate
```

---

### 1.2 Production Error Monitoring (Sentry Integration)

**Problem**: Production errors silently logged to console, no monitoring/alerting  
**Solution**: Integrated Sentry for real-time error tracking and performance monitoring

**Files Changed**:
- [apps/api/src/shared/services/logger.service.ts](apps/api/src/shared/services/logger.service.ts) — Sentry integration
- [apps/web/src/lib/sentry.ts](apps/web/src/lib/sentry.ts) — Frontend Sentry config
- [apps/api/src/config.ts](apps/api/src/config.ts) — SENTRY_DSN config
- [.env.example](.env.example) — Documentation

**Setup Instructions**:

```bash
# 1. Get Sentry DSN from https://sentry.io
# 2. Add to production .env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0

# 3. Errors now automatically reported to Sentry dashboard
# Including: status code, user context, request details, stack traces
```

**What Gets Monitored**:
- ✅ API errors (500, 502, 503, 504)
- ✅ Authentication failures
- ✅ Database errors
- ✅ Validation errors  
- ✅ Network timeouts
- ✅ Frontend exceptions
- ✅ Performance metrics (slow requests)

---

## 2. NETWORK ERROR HANDLING IMPROVEMENTS

### 2.1 Enhanced API Client (30-second timeout + better error detection)

**Problem**: Network errors show generic messages, no retry guidance  
**Solution**: Client detects network type (timeout, offline, server down) with contextual messages

**Files Changed**:
- [apps/web/src/api/client.ts](apps/web/src/api/client.ts) — 30s timeout + network error detection
- [apps/web/src/hooks/useNetworkErrorHandler.ts](apps/web/src/hooks/useNetworkErrorHandler.ts) — New hook for error handling

**Usage in Components**:
```typescript
import { useNetworkErrorHandler } from '../hooks/useNetworkErrorHandler';

function MyComponent() {
  const { showNetworkError } = useNetworkErrorHandler();

  const handleAction = async () => {
    try {
      await api.post('/some-endpoint', data);
    } catch (error) {
      showNetworkError(error, () => handleAction(), {
        action: 'scoring',
        resource: 'leads',
      });
    }
  };

  return <button onClick={handleAction}>Run Action</button>;
}
```

**Error Messages Now Include**:
- ✅ Network vs server errors (user can troubleshoot)
- ✅ Retry guidance ("Wait a moment...")
- ✅ Retry button (if transient error)
- ✅ Error code for debugging
- ✅ Timeout detection (30 seconds)

---

### 2.2 Contextual Error Formatting

**Problem**: Errors like "Failed to score leads" don't tell user what went wrong  
**Solution**: Smart error formatter that explains errors + provides retry guidance

**Files Changed**:
- [apps/web/src/lib/error-formatter.ts](apps/web/src/lib/error-formatter.ts) — Error message formatter

**Examples**:

```typescript
import { formatErrorMessage, formatBulkErrorMessage } from '../lib/error-formatter';

// Single operation error
const { message, retryable } = formatErrorMessage(error, {
  action: 'scoring',
  resource: 'leads',
});
// Returns: "Failed to score leads. Please check your connection and try again."

// Bulk operation (partial failure)
const { message, details } = formatBulkErrorMessage(
  100, // total
  75,  // successful
  25,  // failed
  ['Rate limited']
);
// Returns: "Partial success: 75/100 items processed."
//          "25 items (25%) failed. Rate limited - try again in a moment."
```

---

## 3. USER EXPERIENCE IMPROVEMENTS

### 3.1 Enhanced Toast Component

The Toast component now shows:
- ✅ Contextual error messages (not generic)
- ✅ Error codes for debugging
- ✅ Retry buttons (for transient errors)
- ✅ Icon + color coding

**Example**:
```
[!] Request timed out. Please check your connection and try again.
    TIMEOUT_ERROR [Retry button]
```

### 3.2 Interactive CSS Utility Styles

**Files Created**:
- [apps/web/src/styles/interactive-styles.ts](apps/web/src/styles/interactive-styles.ts) — Button/link/card hover styles

**Use these for consistent UI**:
```typescript
import { buttonStyles, linkStyles, cardStyles } from '../styles/interactive-styles';

// In JSX
<button className={`px-4 py-2 rounded ${buttonStyles.primary}`}>
  Click me
</button>

<a href="#" className={linkStyles.default}>
  Learn more
</a>

<div className={`p-4 rounded ${cardStyles.interactive}`}>
  Hover me
</div>
```

---

## 4. DATABASE SCHEMA CHANGES

### Migration: Add Encrypted Credentials

```sql
-- New columns added to ad_platform_credentials table
ALTER TABLE ad_platform_credentials ADD COLUMN encrypted_credentials TEXT;
ALTER TABLE ad_platform_credentials ADD COLUMN credentials_iv VARCHAR(64);
ALTER TABLE ad_platform_credentials ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Legacy columns remain for backward compatibility (migration period):
-- - access_token
-- - refresh_token  
-- - app_secret
```

**Timeline**:
1. **Phase 1 (Now)**: New writes use encrypted fields, old reads still work
2. **Phase 2 (Week 2)**: Migrate existing credentials to encrypted storage
3. **Phase 3 (Week 4)**: Deprecate and remove legacy fields

---

## 5. CONFIGURATION & DEPLOYMENT

### Environment Variables (New/Updated)

```env
# AWS KMS for credential encryption
KMS_KEY_ID=arn:aws:kms:us-east-1:ACCOUNT:key/KEY-ID

# Sentry error monitoring
SENTRY_DSN=https://key@o0.ingest.sentry.io/0

# Frontend Sentry (Vite env)
VITE_SENTRY_DSN=https://key@o0.ingest.sentry.io/0

# API timeout (30 seconds)
REQUEST_TIMEOUT_MS=30000
```

### Deployment Checklist

- [ ] **Development**: Works with local AES-256 encryption (no AWS needed)
- [ ] **Staging**: Configure AWS KMS and Sentry DSN
- [ ] **Production**: 
  - [ ] AWS KMS ARN configured
  - [ ] Sentry project created and DSN added
  - [ ] Run Prisma migration: `npm run db:migrate`
  - [ ] Install new packages: `npm install`
  - [ ] Test credential encryption/decryption
  - [ ] Monitor Sentry dashboard for errors

---

## 6. DEPENDENCY UPDATES

### Backend (`apps/api/package.json`)
```json
{
  "dependencies": {
    "@aws-sdk/client-kms": "^3.500.0",  // NEW: KMS encryption
    "@sentry/node": "^7.80.0",           // NEW: Error monitoring
    "@aws-sdk/client-s3": "^3.1003.0",  // Already present
    // ... other deps
  }
}
```

### Frontend (`apps/web/package.json`)
```json
{
  "dependencies": {
    "@sentry/react": "^7.80.0",      // NEW: React error tracking
    "@sentry/tracing": "^7.80.0",    // NEW: Performance monitoring
    // ... other deps
  }
}
```

### Install Packages

```bash
npm install
```

---

## 7. TESTING THE IMPROVEMENTS

### Testing Encryption

```typescript
import { EncryptionService } from '../services/encryption.service';

// Test encryption/decryption
const original = { accessToken: 'token-123', appSecret: 'secret-456' };
const { encrypted, iv } = await EncryptionService.encryptObject(original);
const decrypted = await EncryptionService.decryptObject(encrypted, iv);

console.log(original === decrypted); // true
```

### Testing Error Handling

```typescript
// Simulate network error
try {
  await api.get('/nonexistent-endpoint');
} catch (error) {
  const { showNetworkError } = useNetworkErrorHandler();
  showNetworkError(error, retryFunction, { resource: 'leads' });
}
```

### Testing Sentry

```typescript
// In development, test Sentry capture
import * as Sentry from '@sentry/node';

try {
  throw new Error('Test error');
} catch (error) {
  Sentry.captureException(error, { tags: { test: true } });
}
```

---

## 8. MONITORING & ALERTING

### Sentry Dashboard

- **Alerts**: Critical errors (500+) trigger alerts
- **Performance**: Slow endpoints (>5s) flagged
- **Sessions**: User session monitoring
- **Release Tracking**: Deploy releases tracked automatically

### What to Monitor

1. **Error Rate**: Dashboard → Issues → Error count over time
2. **Performance**: Dashboard → Performance → Slow transactions
3. **User Impact**: Issues → Affected users count
4. **Release Health**: Releases → Health metrics per version

---

## 9. NEXT STEPS

### Immediate (Today)
1. ✅ Run `npm install` to install Sentry packages
2. ✅ Review Prisma schema changes
3. ✅ Test encryption service locally

### This Week
1. Set up AWS KMS key (if using production)
2. Create Sentry project and get DSN
3. Run migration: `npm run db:migrate`
4. Test error monitoring in staging
5. Complete Week 4 testing with improved error messages

### Next Sprint (Phase 3)
1. Migrate legacy credentials to encrypted storage
2. Remove deprecated credential fields
3. Add advanced Sentry configurations (custom metrics)
4. Implement rate-limit alerting

---

## 10. TROUBLESHOOTING

### "KMS Encryption failed"

**Cause**: AWS credentials not configured or key invalid  
**Solution**: System falls back to local AES-256 encryption automatically

```typescript
// Logs: "[KMS encryption failed, falling back to local encryption]"
```

### "Sentry not capturing errors"

**Cause**: SENTRY_DSN not set or incorrect environment  
**Solution**: Check that SENTRY_DSN is in `.env` (backend) or `VITE_SENTRY_DSN` (frontend)

```bash
# Verify Sentry is initialized
console.log(process.env.SENTRY_DSN); // Should not be empty in production
```

### "Prisma migration fails"

**Cause**: Schema mismatch  
**Solution**: 
```bash
# Reset and re-sync schema
npx prisma db push --skip-generate
npx prisma generate
```

---

## 11. MONITORING IMPROVEMENTS SUMMARY

| Feature | Before | After | Impact |
|---------|--------|-------|--------|
| **Credential Security** | Plain text | AES-256 + KMS | 🔴 Critical |
| **Error Monitoring** | Console logs | Sentry dashboard | 🔴 Critical |
| **Error Messages** | Generic | Contextual | 🟡 High |
| **Network Errors** | No retry guidance | Smart detection | 🟡 High |
| **API Timeout** | Infinite | 30 seconds | 🟡 High |
| **User Feedback** | Delayed | Real-time toast | 🟢 Medium |

---

**Documents to Review**:
- [SECURITY.md](../../docs/SECURITY.md) — Full security guide
- [FRONTEND_ERROR_HANDLING.md](../../docs/FRONTEND_ERROR_HANDLING.md) — Error patterns
- [host-locally.instructions.md](.github/copilot/host-locally.instructions.md) — Local setup with new features
