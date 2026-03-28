# Stripe Integration Setup Guide

## Prerequisites
- Stripe account (create at https://stripe.com)
- API keys from Stripe Dashboard

## Step 1: Get Stripe Test Keys

1. Go to https://dashboard.stripe.com/
2. Login to your Stripe account
3. Navigate to **Developers** → **API keys** (top right)
4. Make sure **Test mode** is enabled (toggle at top)
5. Copy these keys:
   - **Secret Key** (starts with `sk_test_`)
   - **Publishable Key** (starts with `pk_test_`)

## Step 2: Update .env

Edit `apps/api/.env` and replace the empty Stripe variables:

```bash
STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET_HERE"
BASE_URL="http://localhost:3000"
```

**Note:** `STRIPE_WEBHOOK_SECRET` will be added after webhook setup (see Step 3)

## Step 3: Setup Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add an endpoint**
3. Enter endpoint URL:
   ```
   http://localhost:3000/api/v1/webhooks/stripe
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
5. Click **Add endpoint**
6. After creation, click the endpoint to view details
7. Copy the **Signing secret** (starts with `whsec_`)
8. Add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"
   ```

## Step 4: Add Keys to Web App

Edit `apps/web/.env` (create if doesn't exist):

```bash
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_PUBLISHABLE_KEY_HERE"
```

## Step 5: Test with Stripe Test Cards

Use these cards for testing:

| Card Number | Expiry | CVC | Result |
|------------|--------|-----|--------|
| 4242 4242 4242 4242 | Any future date | Any 3 digits | ✅ Success |
| 4000 0000 0000 0002 | Any future date | Any 3 digits | ❌ Declined |
| 4000 0025 0000 3155 | Any future date | Any 3 digits | ⚠️ Requires 3D Secure |

**Full test card example:**
- Number: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`
- ZIP: `10002`

## Step 6: Test the Billing Flow

1. Start API server:
   ```bash
   cd apps/api && npm run dev
   ```

2. Start Web server:
   ```bash
   cd apps/web && npm run dev
   ```

3. Login to http://localhost:5173
4. Navigate to `/billing`
5. Click "Choose Plan" on any plan
6. Enter test card details (use 4242 4242 4242 4242)
7. Complete checkout
8. Check database:
   ```bash
   # Should see new subscription record in 'subscription' table
   SELECT * FROM "Subscription" WHERE "tenantId" = 'YOUR_TENANT_ID';
   ```

## Step 7: Verify Webhook Delivery

1. Go to https://dashboard.stripe.com/webhooks
2. Click your endpoint
3. Scroll to **Events** section
4. Should see:
   - `checkout.session.completed` ✅
   - `customer.subscription.created` or `customer.subscription.updated` ✅

If events show red ❌ (failed):
- Check API logs for errors
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Verify webhook endpoint URL is accessible

## Troubleshooting

**Error: "Stripe is not configured"**
- Check `STRIPE_SECRET_KEY` is set and has value
- Restart API server after updating .env

**Error: "Missing stripe-signature header"**
- Webhook signature verification failed
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

**Checkout fails silently**
- Check browser console for errors
- Check API logs: `tail -f logs/api.log` (if available)
- Ensure `STRIPE_PUBLISHABLE_KEY` is set in web .env

**Payment shows as "succeeded" but DB not updated**
- Webhook endpoint might not be configured
- Check Stripe webhook delivery logs
- Verify API is receiving POST to `/webhooks/stripe`

## Production Checklist

Before going live:
- [ ] Switch from Test to Live keys in Stripe dashboard
- [ ] Update `BASE_URL` to production domain
- [ ] Test with real credit card (small amount)
- [ ] Set `NODE_ENV=production` in .env
- [ ] Configure CORS if frontend on different domain
- [ ] Enable email notifications in Stripe (Settings → Emails)
- [ ] Set up refund policy
- [ ] Test failed payment recovery workflow
