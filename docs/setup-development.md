# LeadFlowPro — Development Setup & Quickstart Guide

**Last Updated:** March 29, 2026

---

## ✅ Prerequisites

Verify you have these installed:

```bash
# Check versions
node -v      # v20+ required
npm -v       # v9+ required
docker -v    # any recent version
git --version
```

If missing, install from:
- **Node.js:** https://nodejs.org/ (v20 LTS recommended)
- **Docker Desktop:** https://www.docker.com/products/docker-desktop/
- **Git:** https://git-scm.com/

---

## 🚀 Quick Start (5 minutes)

### Step 1: Clone & Install Dependencies

```bash
cd ~/projects  # or your workspace
git clone <repo-url> LeadFlowPro
cd LeadFlowPro
npm install  # Installs all workspace packages
```

### Step 2: Start Infrastructure

```bash
# Terminal 1
npm run docker:up

# Verify containers are healthy
docker ps
# Both leadflow_postgres and leadflow_redis should show (healthy)
```

### Step 3: Configure Environment

Create `apps/api/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://leadflow:leadflow_dev@localhost:5432/leadflow_dev"
FRONTEND_URL="http://localhost:5174"
JWT_SECRET="your-secret-key-here-min-32-chars"

# Dev Super Admin (auto-created on first start)
DEV_SUPER_ADMIN_EMAIL=admin@example.com
DEV_SUPER_ADMIN_PASSWORD=Admin@1234!
DEV_SUPER_ADMIN_TENANT_ID=dev-tenant-local

# Optional integrations (leave blank to skip)
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Step 4: Database Setup

```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Sync database schema
```

### Step 5: Start Development Servers

**Terminal 2 — API Server:**
```bash
npm run dev --workspace=apps/api
```

**Terminal 3 — Web Server:**
```bash
npm run dev --workspace=apps/web
```

You'll see:
```
API:  http://localhost:3000
Web:  http://localhost:5174
```

### Step 6: Login

Navigate to `http://localhost:5174`:
- Email: `admin@example.com`
- Password: `Admin@1234!`

---

## 📋 Detailed Setup for Each Layer

### Database Setup (PostgreSQL 15)

```bash
# Start Docker container
npm run docker:up

# Verify connection
docker exec leadflow_postgres psql -U leadflow -d leadflow_dev -c "SELECT version();"

# Manual connection string (if needed):
# PostgreSQL: postgresql://leadflow:leadflow_dev@localhost:5432/leadflow_dev
# 
# Host:     localhost:5432
# Database: leadflow_dev
# User:     leadflow
# Password: leadflow_dev
```

**Database Management:**

```bash
# Prisma Studio GUI (browse/edit data)
npm run db:studio
# Opens http://localhost:5555

# Reset database (WARNING: deletes all data)
npm run db:push -- --force-reset

# Create migration file
npm run db:migrate -- --name migration_name

# View migration status
npm run db:migrate -- --status
```

### API Server Setup

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | development/staging/production |
| `PORT` | No | Default: 3000 |
| `DATABASE_URL` | Yes | PostgreSQL connection|
| `JWT_SECRET` | Yes | Min 32 characters |
| `FRONTEND_URL` | Yes | CORS origin (http://localhost:5174) |
| `OPENAI_API_KEY` | No | For AI lead scoring |
| `STRIPE_SECRET_KEY` | No | For billing |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook signature key |

**Development Commands:**

```bash
# Run with hot-reload (watches file changes)
npm run dev --workspace=apps/api

# Build for production
npm run build --workspace=apps/api

# Run production build
npm start --workspace=apps/api

# View logs (from docker)
npm run docker:logs
```

**Health Check:**

```bash
curl http://localhost:3000/health
# Response: { "status": "ok", "version": "1.0.0", "env": "development" }
```

### Web Server Setup

**Environment Variables:**

Create `.env` in `apps/web/`:

```env
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
VITE_ENABLE_DEVTOOLS=true
```

**Development Commands:**

```bash
# Hot-reload development server
npm run dev --workspace=apps/web

# Build for production
npm run build --workspace=apps/web

# Preview production build locally
npm run preview --workspace=apps/web

# Lint & type-check
npm run lint --workspace=apps/web
```

Vite automatically opens `http://localhost:5174` in your browser.

---

## 🧪 Testing Setup

### Playwright E2E Tests

```bash
# Run all tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test e2e/smoke-sprint13.spec.ts --headed

# Run in debug mode (step through)
npx playwright test --debug

# View test results in browser
npx playwright show-report
```

### Test Files Location
- `e2e/auth.spec.ts` — Login/logout tests
- `e2e/leads.spec.ts` — Lead CRUD operations
- `e2e/campaigns.spec.ts` — Campaign operations
- `e2e/workflows.spec.ts` — Workflow execution
- `e2e/billing.spec.ts` — Stripe integration
- `e2e/smoke-sprint13.spec.ts` — Quick smoke tests

---

## 🔧 Common Development Tasks

### Database Operations

**Create a new table:**
1. Edit `apps/api/prisma/schema.prisma` — Add model
2. Run: `npm run db:push`
3. Prisma auto-generates types & client

**Seed test data:**
```bash
npm run seed --workspace=apps/api
```

Runs `apps/api/seed.ts`:
- Creates sample company
- Creates sample campaigns
- Creates sample leads
- Creates sample workflows

**Inspect data:**
```bash
npm run db:studio
# Opens Prisma GUI at localhost:5555
```

### Adding a New API Endpoint

1. Create new route handler in module:
   ```typescript
   // apps/api/src/modules/mymodule/mymodule.router.ts
   router.get('/:id', (req, res) => {
     // handler
   })
   ```

2. Register router in `apps/api/src/index.ts`:
   ```typescript
   import { mymoduleRouter } from './modules/mymodule/mymodule.router'
   app.use('/api/v1/mymodule', mymoduleRouter)
   ```

3. Server hot-reloads (via tsx watch)
4. Test with curl or API client

### Adding a New Page Component

1. Create page file:
   ```typescript
   // apps/web/src/pages/MyPage.tsx
   export default function MyPage() {
     return <div>My Page</div>
   }
   ```

2. Add route in `src/App.tsx`:
   ```typescript
   <Route path="/my-page" element={<MyPage />} />
   ```

3. Vite hot-reloads immediately

### Debugging API Issues

**Enable verbose logging:**

In `apps/api/src/index.ts`:
```typescript
app.use(morgan('verbose')); // More detailed logs
```

**Inspect requests:**
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/v1/leads
```

**Check database directly:**
```bash
npm run db:studio
# View tables & raw data
```

### Type Checking

```bash
# Check TypeScript errors
npm run typecheck --workspace=apps/api
npm run typecheck --workspace=apps/web

# The IDE also shows errors in realtime
```

---

## 📁 Important Files & Locations

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | Database schema |
| `apps/api/src/config.ts` | Environment validation |
| `apps/api/src/index.ts` | Server entry & routes |
| `apps/api/src/modules/` | Business domain modules |
| `apps/web/src/App.tsx` | Frontend routing |
| `apps/web/src/pages/` | Page components |
| `apps/web/src/api/` | API queries & hooks |
| `.env` files | Configuration (NOT committed) |
| `docker-compose.yml` | Docker services config |
| `package.json` | Workspace root config |

---

## 🐛 Troubleshooting

### "Port 3000 already in use"

```bash
# Find what's using port 3000
lsof -i :3000
# Or on Windows:
netstat -ano | findstr :3000

# Kill the process
kill -9 <PID>
# Or change PORT in .env
```

### "DATABASE_URL is not set"

Ensure `apps/api/.env` exists and contains:
```env
DATABASE_URL="postgresql://leadflow:leadflow_dev@localhost:5432/leadflow_dev"
```

File must be in `apps/api/`, not root.

### "Prisma engine not found"

```bash
# Reinstall Prisma binaries
npm install --workspace=apps/api
npm run db:generate --workspace=apps/api
```

### Docker container exits immediately

```bash
# Check logs
docker logs leadflow_postgres

# If "data directory has wrong ownership":
docker-compose down -v  # Delete volumes
npm run docker:up       # Recreate
```

### "Cannot find module" TypeScript errors

```bash
# Regenerate type definitions
npm run db:generate --workspace=apps/api

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Frontend shows blank page or 401 errors

Check browser console:
```javascript
// Verify API connection
fetch('http://localhost:3000/health').then(r => r.json()).then(console.log)
```

Verify token:
- Check LocalStorage for JWT token
- Verify 401 response has `WWW-Authenticate` header

### Workflow doesn't execute

1. Check trigger is active: `WorkflowTrigger.isActive = true`
2. Verify cron expression: `0 9 * * *` = 9am daily
3. Check workflow steps are enabled
4. Test on single lead: Workflows → Builder → Test

---

## 📚 Project Structure Deep Dive

### Monorepo Workspace

This is an npm workspace monorepo:

```bash
# Install all dependencies
npm install

# Install in specific package
npm install lodash --workspace=apps/api

# Run script in workspace
npm run dev --workspace=apps/api
npm run build
```

Workspaces allow shared dependencies and cross-package references.

### Environment Strategy

```
.env — Not committed  (Created locally)
.env.example — Committed (Template)
```

Never commit `.env` files with real credentials.

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "feat: description"

# Push & create PR
git push origin feature/my-feature

# After PR approval, squash & merge
```

---

## 🔐 Security Notes for Development

- JWT_SECRET must be random (e.g., `openssl rand -base64 32`)
- Never commit `.env` files
- API keys should be environment-specific
- Database passwords should be strong
- Use HTTPS in production (redirected at middleware level)

---

## 📊 Development Checklist

- [ ] Node.js v20+ installed
- [ ] Docker Desktop running
- [ ] `npm install` completed
- [ ] `apps/api/.env` created
- [ ] `npm run db:push` succeeded
- [ ] API server running on :3000
- [ ] Web server running on :5174
- [ ] Can login with admin@example.com
- [ ] Prisma Studio accessible at :5555

---

## 🎯 Next Steps

1. **Explore the codebase:**
   - Read [../index.md](../index.md) for overview
   - Read [../backend-modules.md](../backend-modules.md) for API structure
   - Read [../frontend-architecture.md](../frontend-architecture.md) for UI structure

2. **Make your first change:**
   - Add a field to the database schema
   - Run `npm run db:push`
   - Add corresponding input field to frontend
   - Test the flow

3. **Understand the patterns:**
   - Study one module (e.g., `apps/api/src/modules/leads/`)
   - Study one page (e.g., `apps/web/src/pages/Leads.tsx`)
   - Replicate the pattern for new features

4. **Run tests:**
   - `npx playwright test --headed` to see E2E tests
   - Understand test patterns

---

## 📞 Getting Help

- **TypeScript errors:** Check IDE or run `npm run typecheck`
- **Runtime errors:** Check browser console (web) & server logs (API)
- **Database issues:** Use Prisma Studio or check Docker logs
- **Missing packages:** Run `npm install` in workspace root

---

**Happy Coding! 🚀**
