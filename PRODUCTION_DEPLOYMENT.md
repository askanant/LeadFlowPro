# Production Deployment Checklist

## Pre-Deployment (Do Before Pushing to GitHub)

### 1. Security Audit
- [ ] All `.env` files excluded in `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] `ENCRYPTION_KEY` and `JWT_SECRET` generated fresh for production
- [ ] Database URL points to production Neon instance
- [ ] CORS whitelist updated with production domain

### 2. Code Quality
- [ ] Run `npm run test` — all tests passing
- [ ] Run `npm run lint` — zero errors
- [ ] Run `npm run build` — successful build
- [ ] TypeScript compilation clean

### 3. Database
- [ ] Neon PostgreSQL production instance created
- [ ] Connection string verified
- [ ] Sample migration tested locally
- [ ] Backup strategy in place

---

## Deployment Steps

### Step 1: Prepare Repository (5 minutes)
```bash
cd c:\Users\Anant Shukla\OneDrive\LeadFlowPro
git init
git add .
git commit -m "LeadFlowPro: Initial production commit"
git branch -M main
git remote add origin https://github.com/askanant/LeadFlowPro.git
git push -u origin main
```

### Step 2: Deploy Frontend to Vercel (10 minutes)
1. **Sign up**: https://vercel.com (or sign in)
2. **Click "New Project"**
3. **Import from Git**: Select `LeadFlowPro` repo
4. **Configure**:
   - Root Directory: `apps/web`
   - Framework: Vite
   - Build Command: `npm run build --workspace @leadflow/web`
   - Install Command: `npm install --legacy-peer-deps`
5. **Environment Variables** (before deploying):
   - `VITE_API_URL`: `https://leadflow-api.onrender.com` (your Render domain)
   - `NODE_ENV`: `production`
6. **Deploy** — Vercel auto-deploys on push to main

### Step 3: Deploy Backend to Render (10 minutes)
1. **Sign up**: https://render.com (connect GitHub)
2. **Create New** → **Web Service**
3. **Connect Repository**: Select `LeadFlowPro`
4. **Configure**:
   - Name: `leadflow-api`
   - Environment: `Node`
   - Build Command: `npm install --legacy-peer-deps && npm run db:generate && npm run build --workspace @leadflow/api`
   - Start Command: `npm run start --workspace @leadflow/api`
   - Plan: **Free**
5. **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://user:pass@...` (from Neon) |
   | `JWT_SECRET` | Generate random 32-char string |
   | `ENCRYPTION_KEY` | Generate 32-byte hex string |
   | `NODE_ENV` | `production` |
   | `API_PORT` | `3000` |
   | `WEB_URL` | `https://your-app.vercel.app` |
   | `SENTRY_DSN` | (optional) |

6. **Deploy** — Render will auto-build and start

### Step 4: Verify Deployments (5 minutes)
```bash
# Web Frontend
curl https://leadflowpro.vercel.app  # Should return HTML

# API Health Check
curl https://leadflow-api.onrender.com/api/health  # Should return {"status": "ok"}

# Test Authentication
curl -X POST https://leadflow-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@$1234!"}'
```

### Step 5: Monitor Logs (Ongoing)
- **Vercel**: https://vercel.com/dashboard → Select project → Logs
- **Render**: https://dashboard.render.com → Select service → Logs

---

## Post-Deployment Configuration

### Custom Domain (Optional)
**Vercel Documentation**: https://vercel.com/docs/concepts/projects/domains

**Render Documentation**: https://render.com/docs/custom-domains

### HTTPS & SSL
- Vercel: Automatic (included)
- Render: Automatic (included)

### Email Notifications
- Vercel: Dashboard → Project Settings → Email Notifications
- Render: Dashboard → Account → Email Preferences

### Monitoring & Alerts
- **Sentry** (error tracking):
  1. Create account: https://sentry.io
  2. Create project (Node.js + React)
  3. Copy SENTRY_DSN
  4. Add to Render env: `SENTRY_DSN`
  5. Errors auto-tracked

### Database Backups
- **Neon** provides automated backups (free tier includes 7-day retention)
- Dashboard: https://console.neon.tech/

---

## Troubleshooting

### Vercel Build Fails
```bash
# Check locally first
npm run build --workspace @leadflow/web
```
- Look at build logs in Vercel dashboard
- Common: Missing environment variable, dependency issue
- Fix: Update `.env` or code, push to main branch

### Render Build Fails
```bash
# Check locally first
npm install --legacy-peer-deps
npm run build --workspace @leadflow/api
```
- Check Render logs (Dashboard → service → Logs)
- Ensure DATABASE_URL is set
- Ensure Node version compatible

### API Not Responding
1. Check Render service is running (green dot)
2. Check logs for startup errors
3. Verify DATABASE_URL is correct
4. Test: `curl https://leadflow-api.onrender.com/api/health`

### Frontend Can't Connect to API
1. Verify `VITE_API_URL` in Vercel environment
2. Check CORS in `apps/api/src/index.ts`
3. Verify Render API URL is correct
4. Check browser console for CORS errors

---

## Rollback Plan

### Vercel Rollback
1. Dashboard → Deployments → Previous deployment
2. Click "Redeploy"

### Render Rollback
1. Dashboard → service → Deploys
2. Previous deploy → "Redeploy" button

### Git Rollback
```bash
git revert <commit-hash>  # Safe: creates new commit
git push origin main
```

---

## Performance Optimization

### Frontend (Vercel)
- Vercel automatically optimizes images
- Gzip/Brotli compression enabled by default
- CDN distributed globally

### Backend (Render)
- Free tier: Shared CPU (for hobby)
- Paid tiers available for better performance
- Consider upgrade if response times > 500ms

### Database (Neon)
- Automatic query optimization
- Connection pooling included
- Monitor usage: https://console.neon.tech

---

## Cost Summary (Monthly)

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel (Frontend) | 1GB bandwidth, unlimited deployments | $0 |
| Render (Backend) | 750 hours/month | $0* |
| Neon PostgreSQL | 3GB storage, 5 branches | $0* |
| Sentry Monitoring | 5000 events/month | $0 |
| Total | | **$0-29/month** |

*Cost increases with usage beyond free limits (Render charges $7/month for continued always-on service)

---

## Next Steps After Deployment

1. **Monitor**: Watch logs for 24 hours
2. **Test**: Full smoke test on production
3. **Backup**: Configure database backups
4. **Security**: Enable 2FA on Vercel/Render/GitHub
5. **Custom Domain**: (Optional) Set up custom domain
6. **CI/CD**: (Optional) Set up GitHub Actions for automated testing

---

## Support & Documentation

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **GitHub Help**: https://docs.github.com
