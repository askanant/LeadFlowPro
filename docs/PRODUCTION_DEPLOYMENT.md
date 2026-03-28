# LeadFlowPro Production Deployment Guide

Status: READY FOR PRODUCTION
Last Updated: March 11, 2026

## Quick Start (2-4 hours)

### Prerequisites
- Linux server (Ubuntu 20.04+)
- Node.js 18+, PostgreSQL, Redis, Nginx
- SSL certificate (Let's Encrypt)
- Domain name

### 1. Pre-Deployment

- Run: npm audit (should have zero vulnerabilities)
- Build: npm run build
- Create production .env with JWT_SECRET, DATABASE_URL
- Run migrations: npx prisma migrate deploy

### 2. Server Setup

- Create leadflow user: sudo useradd -m leadflow
- Create directories: /var/www/leadflow /var/log/leadflow
- Copy built files (api/dist, web/dist)
- Install SSL: certbot certonly --standalone -d yourdomain.com

### 3. Configure Nginx

Set up reverse proxy:
- Frontend served from /var/www/leadflow/web/dist
- API proxied to http://localhost:3000
- HTTPS redirect from HTTP
- Add security headers (HSTS, CSP, etc.)

### 4. Configure API Service

Create systemd service file (/etc/systemd/system/leadflow-api.service):
- Start Node.js API on port 3000
- Auto-restart on failure
- Set environment variables from .env

Start service:
```
sudo systemctl enable leadflow-api
sudo systemctl start leadflow-api
```

### 5. Database Setup

- Create PostgreSQL database: createdb leadflow
- Run Prisma migrations: npx prisma migrate deploy
- Configure backups: pg_dump daily to /var/backups/

### 6. Monitoring & Logging

- Optional: Setup Sentry for error tracking
- Optional: Datadog or New Relic for monitoring
- Log rotation: /etc/logrotate.d/leadflow
- Monitor: /var/log/leadflow/ and journalctl -u leadflow-api

### 7. Security Checklist

BEFORE GOING LIVE:

- JWT_SECRET is unique (32+ characters)
- DATABASE_URL uses strong password
- NODE_ENV=production
- ENFORCE_HTTPS=true
- FRONTEND_URL correct
- Backups tested and working
- SSL certificate is valid (not self-signed)
- Security headers present in response
- Rate limiting active
- Audit logging working

### 8. Verification

Test endpoints:
```
curl https://yourdomain.com/api/v1/health
curl -H "Authorization: Bearer TOKEN" https://yourdomain.com/api/v1/users/me
```

Check logs:
```
journalctl -u leadflow-api -n 50
tail -f /var/log/nginx/access.log
```

### 9. First 24 Hours

Monitor:
- Error rates (should be ~0%)
- API response times (< 500ms)
- Rate limit hits
- Failed login attempts
- Disk space usage

Test:
- Full login to logout flow
- Create campaigns and leads
- Analytics calculations
- Settings/profile updates

## Scaling for High Traffic

- Multiple API instances behind load balancer
- Redis for distributed rate limiting
- Database read replicas for analytics
- CDN for static assets
- PgBouncer for database connection pooling

## Maintenance

Weekly: Check logs, monitor rate limits
Monthly: npm audit, review backups, test restoration
Quarterly: Penetration testing, security review

## Emergency Procedures

Compromised JWT_SECRET:
1. Rotate JWT_SECRET
2. Set token expiry to 1 minute (force re-login)
3. Review audit logs
4. Notify security team

High Error Rate:
1. Check logs: journalctl -u leadflow-api
2. Check database connectivity
3. Restart service if memory leak
4. Review recent changes

DDoS Attack:
1. Check rate limit hits
2. Cloudflare/CDN filters at edge
3. Monitor audit logs
4. Consider temporary IP whitelisting

## Support

Security Issues: security@leadflowpro.com
Security Details: See docs/SECURITY.md
Monitoring Guide: See docs/SECURITY.md

PRODUCTION STATUS: READY
All security features implemented and tested.
Ready for deployment.
