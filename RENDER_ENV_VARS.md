# Render Environment Variables Setup Guide

## Required Variables (Must Set)

### 1. DATABASE_URL
**What it is**: PostgreSQL connection string from Neon  
**Where to get it**:
1. Go to https://console.neon.tech/
2. Select your LeadFlowPro project
3. Click "Connection string" → Copy the PostgreSQL URL
4. Should look like: `postgresql://user:password@host.neon.tech:5432/dbname?sslmode=require`

**Set in Render**: 
- Key: `DATABASE_URL`
- Value: `postgresql://user:password@host.neon.tech:5432/dbname?sslmode=require`

---

### 2. JWT_SECRET
**What it is**: Secret key for signing JWT authentication tokens  
**How to generate**:
```bash
# Generate a random 64-character string (use one of these)
# Option 1: PowerShell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))

# Option 2: Use an online generator
https://www.uuidgenerator.net/ (copy UUID and repeat it twice)

# Example: abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890def
```

**Set in Render**:
- Key: `JWT_SECRET`
- Value: Your generated random string (minimum 32 characters)

---

### 3. ENCRYPTION_KEY
**What it is**: 32-byte hex string for AES-256 encryption of credentials  
**How to generate**:
```bash
# Generate 32-byte hex string (64 hex characters)
# Option 1: PowerShell
$bytes = [System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32)
[System.BitConverter]::ToString($bytes).Replace('-','').ToLower()

# Option 2: Use online hex generator
https://www.random.org/bytes/ (select 32 bytes, output as hex)

# Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f
```

**Set in Render**:
- Key: `ENCRYPTION_KEY`
- Value: Your generated 32-byte hex string (exactly 64 hex characters)

---

### 4. NODE_ENV
**What it is**: Environment mode  
**Set in Render**:
- Key: `NODE_ENV`
- Value: `production`

---

### 5. API_PORT
**What it is**: Port where API server runs  
**Set in Render**:
- Key: `API_PORT`
- Value: `3000`

---

### 6. WEB_URL
**What it is**: URL of your Vercel frontend (for CORS)  
**Example**: `https://your-app.vercel.app` or `https://leadflowpro.vercel.app`  
**How to get it**: Deploy to Vercel first, then copy the URL  

**Set in Render**:
- Key: `WEB_URL`
- Value: `https://your-app.vercel.app`

---

## Optional Variables (Nice to Have)

### 7. SENTRY_DSN
**What it is**: Error tracking service (Sentry.io)  
**Where to get it**:
1. Go to https://sentry.io/
2. Create free account and new project (select Node.js)
3. Copy the DSN value (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/12345`)

**Set in Render**:
- Key: `SENTRY_DSN`
- Value: `https://xxxxx@xxxxx.ingest.sentry.io/12345`

---

### 8. STRIPE_SECRET_KEY
**What it is**: Stripe API key for payment processing  
**Where to get it**:
1. Go to https://dashboard.stripe.com/
2. Go to Developers → API Keys
3. Copy "Secret Key" (starts with `sk_live_` for production)

**Set in Render**:
- Key: `STRIPE_SECRET_KEY`
- Value: `sk_live_your_stripe_secret_key_here`

---

### 9. STRIPE_PUBLIC_KEY
**What it is**: Stripe public key (for frontend)  
**Where to get it**: Same Stripe dashboard, copy "Publishable Key" (starts with `pk_live_`)

**Set in Render**:
- Key: `STRIPE_PUBLIC_KEY`
- Value: `pk_live_your_stripe_publishable_key_here`

---

### 10. STRIPE_WEBHOOK_SECRET
**What it is**: Secret for validating Stripe webhooks  
**Where to get it**:
1. Stripe Dashboard → Developers → Webhooks
2. Create endpoint: `https://your-api-domain.onrender.com/api/billing/webhook`
3. Copy "Signing secret" (starts with `whsec_`)

**Set in Render**:
- Key: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_your_webhook_secret_here`

---

### 11. KMS_KEY_ID (AWS Only)
**What it is**: AWS KMS key for production encryption  
**Where to get it**: AWS Console → KMS → Customer Managed Keys  
**Only set if**: You're using AWS KMS instead of local encryption

**Set in Render**:
- Key: `KMS_KEY_ID`
- Value: `arn:aws:kms:region:account-id:key/key-id`

---

### 12. KMS_REGION (AWS Only)
**What it is**: AWS region for KMS  
**Example**: `us-east-1`

**Set in Render**:
- Key: `KMS_REGION`
- Value: `us-east-1`

---

### 13. ADMIN_EMAIL
**What it is**: Email of the first admin user  
**Set in Render**:
- Key: `ADMIN_EMAIL`
- Value: `admin@your-domain.com` or `anantshukla@live.com`

---

### 14. DEFAULT_TENANT_ID
**What it is**: Default tenant for development  
**Set in Render**:
- Key: `DEFAULT_TENANT_ID`
- Value: `default-tenant` or `production-tenant`

---

## Email Configuration (Optional)

### 15. SMTP_HOST
**What it is**: Email service SMTP server  
**Common values**:
- Gmail: `smtp.gmail.com`
- SendGrid: `smtp.sendgrid.net`
- Mailgun: `smtp.mailgun.org`

**Set in Render**:
- Key: `SMTP_HOST`
- Value: `smtp.gmail.com` (if using Gmail)

---

### 16. SMTP_PORT
**What it is**: SMTP server port  
**Common values**:
- TLS: `587`
- SSL: `465`

**Set in Render**:
- Key: `SMTP_PORT`
- Value: `587`

---

### 17. SMTP_USER
**What it is**: SMTP username (usually email)  
**Set in Render**:
- Key: `SMTP_USER`
- Value: `your-email@gmail.com`

---

### 18. SMTP_PASSWORD
**What it is**: SMTP password (Gmail requires app-specific password)  
**For Gmail**:
1. Go to https://myaccount.google.com/apppasswords
2. Select Mail and Windows Computer
3. Copy the generated 16-character password

**Set in Render**:
- Key: `SMTP_PASSWORD`
- Value: `16-character-app-password`

---

## Redis Configuration (Optional, if using)

### 19. REDIS_URL
**What it is**: Redis cache connection URL  
**Example**: `redis://default:password@host:6379`

**Set in Render**:
- Key: `REDIS_URL`
- Value: `redis://default:password@host:6379`

---

## Summary Table

| Variable | Required | Example Value | Notes |
|----------|----------|---|---|
| `DATABASE_URL` | ✅ YES | `postgresql://user:pass@host.neon.tech/db?sslmode=require` | From Neon console |
| `JWT_SECRET` | ✅ YES | `abc123def456...` | Generate random 32+ chars |
| `ENCRYPTION_KEY` | ✅ YES | `a1b2c3d4e5f6...` | 32-byte hex string (64 chars) |
| `NODE_ENV` | ✅ YES | `production` | Always "production" |
| `API_PORT` | ✅ YES | `3000` | Fixed port |
| `WEB_URL` | ✅ YES | `https://your-app.vercel.app` | Vercel frontend URL |
| `SENTRY_DSN` | ⭕ OPTIONAL | `https://xxxxx@x.ingest.sentry.io/12345` | For error tracking |
| `STRIPE_SECRET_KEY` | ⭕ OPTIONAL | `sk_live_...` | For payments |
| `STRIPE_PUBLIC_KEY` | ⭕ OPTIONAL | `pk_live_...` | For payments |
| `STRIPE_WEBHOOK_SECRET` | ⭕ OPTIONAL | `whsec_...` | For payments |
| `KMS_KEY_ID` | ⭕ OPTIONAL | `arn:aws:kms:...` | AWS KMS only |
| `KMS_REGION` | ⭕ OPTIONAL | `us-east-1` | AWS region |
| `ADMIN_EMAIL` | ⭕ OPTIONAL | `admin@company.com` | Initial admin |
| `DEFAULT_TENANT_ID` | ⭕ OPTIONAL | `production-tenant` | Tenant identifier |
| `SMTP_HOST` | ⭕ OPTIONAL | `smtp.gmail.com` | Email server |
| `SMTP_PORT` | ⭕ OPTIONAL | `587` | Email port |
| `SMTP_USER` | ⭕ OPTIONAL | `your-email@gmail.com` | Email username |
| `SMTP_PASSWORD` | ⭕ OPTIONAL | `16-char-app-password` | Email password |
| `REDIS_URL` | ⭕ OPTIONAL | `redis://host:6379` | Cache service |

---

## How to Set Variables in Render

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Select your Web Service**: `leadflow-api`
3. **Click "Environment"** tab
4. **Add each variable**:
   - Click "Add Environment Variable"
   - Enter Key and Value
   - Click "Add"
5. **Redeploy** after adding all variables

---

## Minimum Setup (To Get Running)

At minimum, set these 6 variables to get started:

```
DATABASE_URL = [from Neon]
JWT_SECRET = [generate random string]
ENCRYPTION_KEY = [generate hex string]
NODE_ENV = production
API_PORT = 3000
WEB_URL = [Vercel URL]
```

---

## Verification After Setting Variables

After deployment, verify the API is working:

```bash
# Test health endpoint
curl https://leadflow-api.onrender.com/api/health

# Should return:
{"status": "ok", "database": "connected"}

# Test login (use dev super admin)
curl -X POST https://leadflow-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"anantshukla@live.com","password":"Admin@$1234!"}'
```

If you get errors, check Render logs:
- Render Dashboard → Select service → Logs
- Look for startup errors about missing env variables

---

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` files to GitHub
- Never share `JWT_SECRET` or `ENCRYPTION_KEY` publicly
- Use strong, random values (not dictionary words)
- Rotate sensitive keys periodically
- Store backup copies in secure location

---

## Next Steps

1. ✅ Set all 6 minimum variables in Render
2. ✅ Click "Deploy" button
3. ✅ Wait for deployment to complete (2-5 minutes)
4. ✅ Check logs for errors
5. ✅ Test health endpoint
6. ✅ Update Vercel with Render API URL: `https://leadflow-api.onrender.com`
