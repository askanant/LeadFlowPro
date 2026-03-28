# GitHub & Vercel Deployment Guide

## Step 1: Create GitHub Repository

### Using GitHub CLI (Recommended):
```bash
# Install GitHub CLI if needed: https://cli.github.com/

# Login to GitHub
gh auth login

# Create new repository
gh repo create LeadFlowPro --public --source=. --remote=origin --push
```

### OR Using GitHub Web Interface:
1. Go to https://github.com/new
2. Repository name: `LeadFlowPro`
3. Description: `AI-powered lead generation and campaign management platform`
4. Public (for Vercel free tier)
5. Initialize without README/gitignore (we have them)
6. Create repository

### Then push code:
```bash
cd c:\Users\Anant Shukla\OneDrive\LeadFlowPro

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: LeadFlowPro with security hardening"

# Add remote (replace askanant with your GitHub username)
git remote add origin https://github.com/askanant/LeadFlowPro.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Vercel for Frontend

1. Go to https://vercel.com/new
2. Connect GitHub account
3. Import `LeadFlowPro` repository
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build --workspace @leadflow/web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install --legacy-peer-deps`

5. **Environment Variables** (add these in Vercel dashboard):
```
VITE_API_URL=https://your-api-domain.com  # e.g., https://leadflow-api.railway.app
NODE_ENV=production
```

6. Deploy

---

## Step 3: Deploy Backend to Render (Free Tier)

1. Go to https://render.com/
2. Create account & connect GitHub
3. Create new **Web Service**:
   - **Repository**: `LeadFlowPro`
   - **Runtime**: Node
   - **Build Command**: `npm install --legacy-peer-deps && npm run build --workspace @leadflow/api`
   - **Start Command**: `npm run start --workspace @leadflow/api`
   - **Root Directory**: `apps/api` (optional, Render can detect)

4. **Environment Variables** (in Render dashboard):
```
DATABASE_URL=your_neon_postgresql_url
JWT_SECRET=generate_strong_random_string
ENCRYPTION_KEY=generate_32_byte_hex
NODE_ENV=production
API_PORT=3000
WEB_URL=https://your-vercel-domain.vercel.app
```

5. Free tier includes: 750 free hours/month (enough for 1 always-on service)

---

## Step 4: Configure Database for Production

### Neon PostgreSQL (Already In Use):
- Get your production connection string from Neon dashboard
- Update `DATABASE_URL` in both Vercel and Render environment variables
- Run migrations:
```bash
npx prisma db push --url "postgresql://..."
```

---

## Step 5: Update CORS & API Endpoints

Update in your codebase before pushing:

**apps/api/src/index.ts** (or your CORS config):
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-vercel-app.vercel.app',
  'https://your-domain.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## Step 6: Monitoring & Maintenance

### Sentry Configuration:
1. Sign up at https://sentry.io/
2. Create new project (select Node/React)
3. Get SENTRY_DSN
4. Add to environment variables in Vercel and Render

### GitHub Actions (CI/CD):
Create `.github/workflows/test.yml`:
```yaml
name: Test & Build
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install --legacy-peer-deps
      - run: npm run test
      - run: npm run build
```

---

## Deployment Checklist

- [ ] GitHub repository created and pushed
- [ ] Vercel frontend deployed
- [ ] Render backend deployed
- [ ] Environment variables configured
- [ ] CORS updated with production URLs
- [ ] Database migrations applied
- [ ] Sentry configured (optional)
- [ ] Custom domain connected
- [ ] HTTPS certificates active
- [ ] Test login with admin credentials

---

## Post-Deployment Testing

```bash
# Test API health
curl https://your-api-domain.com/api/health

# Test frontend
Visit https://your-app.vercel.app

# Monitor logs
Vercel Dashboard: https://vercel.com/dashboard
Render Dashboard: https://dashboard.render.com
```

---

## Cost Estimate (Monthly)

- **Vercel**: Free tier (up to 1GB bandwidth)
- **Render**: Free tier (750 hours, shared CPU)
- **Neon PostgreSQL**: Free tier (up to 5 branches, 3GB storage)
- **Sentry**: Free tier (5000 events/month)

**Total: $0/month for hobby usage**

---

## Next Steps

1. Push code to GitHub
2. Deploy frontend → Vercel
3. Deploy backend → Render
4. Test production environment
5. Configure custom domain (optional)
6. Set up automated backups
