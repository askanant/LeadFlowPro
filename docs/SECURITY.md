# LeadFlowPro Security Documentation

Version: 1.0.0 | Status: Production Ready | Last Updated: March 11, 2026

## Overview

LeadFlowPro implements enterprise-grade security with rate limiting, JWT authentication, comprehensive logging, and audit trails.

## Security Features Implemented

### 1. Rate Limiting (6 Tiers)
- Global: 1,000 req/15min per IP
- Login: 5 attempts/15min per email+IP  
- Register: 3 accounts/hour per IP
- API (authenticated): 100 req/min per user
- API (public): 20 req/min
- Webhooks: 10,000 req/hour per IP

### 2. JWT Authentication
- Algorithm: HS256 with JWT_SECRET
- Access Token: 2 hours
- Refresh Token: 7 days
- Password Hashing: bcryptjs (12 rounds, ~0.5-1s to verify)
- Auto-Refresh: 5 minutes before expiry
- Token Blacklist: Prevents replay after logout

### 3. Request Protection
- Timeout: 30 seconds (HTTP 408)
- Size Limit: 1 MB
- HTTPS Enforcement: Production mode
- HSTS Header: 1 year + preload

### 4. Error Handling
- Request ID tracking (UUID per request)
- Sensitive field redaction (passwords, tokens, API keys)
- User-friendly error messages
- Slow request monitoring (>5s)
- Development: Console logs
- Production: Ready for Sentry/DataDog

### 5. Audit Logging
- Tracks: login, logout, campaign CRUD, lead updates, admin actions
- Captures: User, Tenant, Action, Resource, IP, Status, Timestamp
- Queryable by tenant, user, or resource
- JSON storage of before/after changes

### 6. Input Validation
- Zod schemas with size constraints
- Sanitization removes XSS vectors (<>, javascript:)
- SQL Injection prevention via Prisma parameterized queries
- Dynamic filter whitelist

### 7. Frontend Security
- localStorage persistence (Zustand persist middleware)
- Auto-login on page refresh
- useTokenRefresh hook for proactive renewal
- Token-based retry on 401
- Automatic session restoration

### 8. CORS & Headers
- Production: Whitelist FRONTEND_URL
- Security headers via Helmet.js
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options

## Environment Variables

Required:
- JWT_SECRET=<32+ character random string>
- FRONTEND_URL=https://yourdomain.com
- NODE_ENV=production
- DATABASE_URL=postgresql://...

Optional:
- REDIS_URL=redis://localhost:6379  (for distributed rate limiting)

## Key Files

Middleware:
- apps/api/src/shared/middleware/rate-limit.middleware.ts
- apps/api/src/shared/middleware/timeout.middleware.ts
- apps/api/src/shared/middleware/request-id.middleware.ts
- apps/api/src/shared/middleware/https.middleware.ts
- apps/api/src/shared/middleware/timing.middleware.ts

Services:
- apps/api/src/shared/services/logger.service.ts
- apps/api/src/shared/services/audit.service.ts
- apps/api/src/shared/services/token-blacklist.service.ts

Utilities:
- apps/api/src/shared/utils/sanitize.ts

Frontend:
- apps/web/src/hooks/useTokenRefresh.ts
- apps/web/src/store/auth.ts
- apps/web/src/api/client.ts

Database:
- AuditLog model in apps/api/prisma/schema.prisma

## Production Deployment Checklist

Pre-Deployment:
- npm audit passes (zero vulnerabilities)
- All secrets moved to vault
- JWT_SECRET is unique (32+ chars)
- FRONTEND_URL configured correctly
- Database backups configured
- Centralized logging ready (Sentry/DataDog)
- Rate limits tuned for expected traffic
- CORS origins verified

Deployment:
- HTTPS certificate installed (valid CA, not self-signed)
- Reverse proxy configured (nginx/Caddy)
- Database credentials changed from defaults
- Backup restoration tested
- Monitoring dashboards created
- Incident response plan documented

Post-Deployment (First 24 Hours):
- Test login flow end-to-end
- Verify HTTPS redirect working
- Confirm security headers present
- Monitor error rates for anomalies
- Verify rate limiting is active
- Check CORS is blocking unauthorized origins
- Confirm audit logs writing to database

## Monitoring Tasks

Weekly:
- Review error logs for suspicious patterns
- Check rate limit hits (potential DDoS/attacks)
- Verify failed login attempts

Monthly:
- Run npm audit, update dependencies
- Review audit logs for privilege escalations
- Test password reset flow
- Verify backups restoration

Quarterly:
- External penetration testing
- Security review of recent code changes
- Update security documentation
- Tune rate limits based on traffic patterns

## Error Response Codes

VALIDATION_ERROR (422) - Invalid input
UNAUTHORIZED (401) - Auth failed/expired
FORBIDDEN (403) - Insufficient permissions
NOT_FOUND (404) - Resource doesn't exist
CONFLICT (409) - Duplicate resource
TOO_MANY_REQUESTS (429) - Rate limit exceeded
TIMEOUT (408) - Request took >30s
INTERNAL_ERROR (500) - Server error

Response Headers:
- X-Request-ID (unique request identifier)
- RateLimit-Limit (max requests in window)
- RateLimit-Remaining (requests remaining)
- RateLimit-Reset (unix timestamp when limit resets)

## Security Best Practices

1. Never commit secrets to git
2. Use strong JWT_SECRET (32+ random characters)
3. Enable HTTPS in production
4. Monitor rate limit hits (early DDoS detection)
5. Review audit logs regularly
6. Keep dependencies updated (npm audit)
7. Test backup restoration monthly
8. Implement centralized logging for production
9. Configure monitoring alerts for errors/anomalies
10. Document incident response procedures

## Support

Reporting Security Issues:
Email: security@leadflowpro.com
DO NOT open GitHub issues for security vulnerabilities

---

Implementation Status: COMPLETE (Phases 1-7)
Tested & Verified: YES
Ready for Production: YES
Last Updated: March 11, 2026
