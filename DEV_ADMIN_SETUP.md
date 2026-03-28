# Development Super Admin Setup

This guide explains how to create and use a development super admin account in LeadFlowPro.

## Overview

The development super admin setup is **secure** because:
- Credentials are stored in `.env` (local only, never committed)
- Only runs in development mode (`NODE_ENV=development`)
- Completely disabled in production
- No hardcoded credentials in source code

## Setup Instructions

### Step 1: Add to Your Local .env

Create or edit `.env` in the `apps/api` directory with these variables:

```env
NODE_ENV=development

# Dev Super Admin - DELETE THESE IN PRODUCTION
DEV_SUPER_ADMIN_EMAIL=anantshukla@live.com
DEV_SUPER_ADMIN_PASSWORD=Admin@$1234!
DEV_SUPER_ADMIN_TENANT_ID=dev-tenant-local
```

**Important:** Never commit `.env` to version control. It's in `.gitignore`.

### Step 2: Start the API

The dev admin will be created automatically on startup:

```bash
cd apps/api
npm run dev
```

### Expected Output

You should see:

```
═══════════════════════════════════════════════════════════
DEV SUPER ADMIN CREDENTIALS
═══════════════════════════════════════════════════════════
Email:    anantshukla@live.com
Password: Admin@$1234!
TenantID: dev-tenant-local
═══════════════════════════════════════════════════════════

🚀 LeadFlow Pro API running on port 3000 [development]
```

### Step 3: Login to Frontend

1. Open http://localhost:5175
2. Enter email: `anantshukla@live.com`
3. Enter password: `Admin@$1234!`
4. You'll be logged in as super admin

## Manual Creation

If the auto-creation doesn't work, you can manually create the dev admin:

```bash
cd apps/api
npx ts-node scripts/create-dev-admin.ts
```

## Changing Credentials

Just update the `.env` file and restart the API:

```env
DEV_SUPER_ADMIN_EMAIL=newadmin@example.com
DEV_SUPER_ADMIN_PASSWORD=NewPassword123!
```

The script will update the existing admin user with new credentials.

## Disabling Dev Admin

Simply remove or comment out these variables in `.env`:

```env
# DEV_SUPER_ADMIN_EMAIL=anantshukla@live.com
# DEV_SUPER_ADMIN_PASSWORD=Admin@$1234!
```

Or delete the `.env` file entirely.

## How It Works

1. **Auto-Creation** (on API startup):
   - Checks if `NODE_ENV === 'development'`
   - Reads `DEV_SUPER_ADMIN_EMAIL` and `DEV_SUPER_ADMIN_PASSWORD` from `.env`
   - Creates or updates super admin user
   - Creates development tenant if needed
   - Prints credentials to console

2. **Security**:
   - Uses bcrypt to hash passwords (never stored plaintext)
   - Credentials only read from environment (not hardcoded)
   - Only runs in development mode
   - Can be disabled by removing env vars

3. **Updates**:
   - If user exists, role and password are updated
   - If user doesn't exist, new user is created
   - If tenant doesn't exist, development tenant is created

## Troubleshooting

### "ERROR: createDevAdmin cannot run in production!"

The script detected `NODE_ENV=production`. Set `NODE_ENV=development` in `.env`.

### Dev admin not created

1. Check `.env` exists in `apps/api/`
2. Verify `DEV_SUPER_ADMIN_EMAIL` and `DEV_SUPER_ADMIN_PASSWORD` are set
3. Check API console output for errors
4. Manually run: `npx ts-node scripts/create-dev-admin.ts`

### Can't login with dev admin credentials

1. Verify you're using the correct email and password
2. Check that the API created the user (look at startup output)
3. Try manually creating again: `npx ts-node scripts/create-dev-admin.ts`
4. Check database to confirm user exists

## What NOT to Do

❌ **Never commit `.env` to git**
❌ **Never use dev admin credentials in production**
❌ **Never leave `DEV_SUPER_ADMIN_*` variables in production `.env`**
❌ **Never hardcode credentials in the source code**

## For Production

In production:
- `.env` is not committed; use environment variables in deployment platform
- `DEV_SUPER_ADMIN_*` variables should NOT be set
- Create users via normal signup flow or admin panel
- Use strong, unique passwords
- Rotate credentials regularly

---

Created as part of Option C: Error Handling & Security Implementation
