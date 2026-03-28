# Stripe Billing System - End-to-End Testing Guide

## Prerequisites
✅ API running on `http://localhost:3000`
✅ Web running on `http://localhost:5173`
✅ Stripe test keys configured in `.env` files
✅ Webhook endpoint registered in Stripe dashboard

## Test Scenarios

### Scenario 1: New User Sign Up & Plan Selection

**Steps:**
1. Go to `http://localhost:5173/register`
2. Create new account:
   - Company: "Test Company"
   - Email: `test-billing-$(date +%s)@test.com`
   - Password: `Password123!`
3. Complete onboarding (Setup page)
4. Click "Billing" in sidebar
5. Verify page loads with:
   - ✅ Current subscription section (should show "No active subscription")
   - ✅ Usage metrics (campaigns, leads, team members)
   - ✅ Three plan cards (Starter, Pro, Enterprise)
   - ✅ Monthly/Annual toggle

**Expected Result:**
```
Current Subscription: No active subscription
Usage: 0/5 campaigns, 0/1,000 leads, 1/2 team members
Plan Cards: Starter ($99/mo), Pro ($299/mo), Enterprise ($999/mo)
```

---

### Scenario 2: Complete Stripe Checkout (Test Card Success)

**Steps:**
1. From Billing page, click "Choose Plan" on Starter ($99/mo)
2. Redirect to Stripe Checkout with:
   - ✅ Plan name: "LeadFlow Pro Starter Plan"
   - ✅ Amount: $99.00
   - ✅ Billing: Monthly
3. Enter test card details:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/25
   CVC: 123
   Cardholder Name: Test User
   ```
4. Click "Pay" button
5. Wait for redirect (should return to `http://localhost:5173/billing`)

**Expected Result:**
```
✅ Payment successful
✅ Page redirects to /billing
✅ Current Subscription shows "Starter - Active"
✅ Renewal date displayed
✅ Button changes to "Manage Subscription"
```

**Database Check:**
```sql
-- In Prisma Studio or database client
SELECT * FROM "Subscription"
WHERE "tenantId" = 'YOUR_TENANT_ID';

-- Should show:
-- plan: 'starter'
-- status: 'active'
-- stripeCustomerId: 'cus_...'
-- stripeSubscriptionId: 'sub_...'
-- currentPeriodStart: (today)
-- currentPeriodEnd: (30 days from now)
```

---

### Scenario 3: Card Decline (Test Card Fail)

**Steps:**
1. From Billing page, click "Choose Plan" on Pro ($299/mo)
2. Enter declining test card:
   ```
   Card Number: 4000 0000 0000 0002
   Expiry: 12/25
   CVC: 123
   ```
3. Click "Pay" button
4. Should see error message

**Expected Result:**
```
❌ Payment declined
✅ Error message: "Your card was declined"
✅ User stays on checkout page
✅ Can retry with different card
```

---

### Scenario 4: Billing Enforcement - Campaign Creation

**Prerequisites:**
- ✅ User is on Starter plan (5 campaign limit)
- ✅ No campaigns created yet

**Steps:**
1. Go to `http://localhost:5173/campaigns`
2. Click "Create Campaign"
3. Fill form and create campaigns 1-5 (should succeed)
4. Try to create campaign #6

**Expected Result:**
```
Campaigns 1-5: ✅ Created successfully
Campaign #6: ❌ Error "Plan limit exceeded"
Message: "Upgrade to Pro or Enterprise for more campaigns"
Button: "Upgrade Plan" → Links to /billing
```

---

### Scenario 5: Manage Subscription (Stripe Portal)

**Prerequisites:**
- ✅ Active subscription on any plan

**Steps:**
1. Go to `http://localhost:5173/billing`
2. Click "Manage Subscription"
3. Should redirect to Stripe Customer Portal
4. Verify can:
   - View invoice history
   - Update payment method
   - Change billing email
   - Request refund
   - Cancel subscription

**Expected Result:**
```
✅ Redirects to Stripe portal
✅ Shows current subscription details
✅ Can update payment method
✅ Shows invoice history
```

---

### Scenario 6: Plan Upgrade (Starter → Pro)

**Prerequisites:**
- ✅ User on Starter plan ($99/mo)

**Steps:**
1. From Billing page, click "Choose Plan" on Pro ($299/mo)
2. Enter test card: `4242 4242 4242 4242`
3. Complete checkout
4. Wait for webhook to process

**Expected Result:**
```
✅ Checkout succeeds
✅ Page redirects to /billing
✅ Subscription now shows "Pro - Active"
✅ Renewal date updated
✅ Plan limits updated: 20 campaigns, 10k leads
```

---

### Scenario 7: Subscription Cancellation

**Prerequisites:**
- ✅ Active subscription

**Steps:**
1. Go to Billing page
2. Click "Manage Subscription"
3. In Stripe Portal, click "Cancel plan"
4. Confirm cancellation

**Expected Result:**
```
✅ Stripe Portal shows cancellation options
✅ Can select "Cancel subscription"
✅ Option to cancel immediately or at end of period
✅ Confirmation page shows cancellation scheduled
✅ Database shows: status='canceled', cancelAtPeriodEnd=true (if end-of-period)
```

---

### Scenario 8: Lead Storage Limit Enforcement

**Prerequisites:**
- ✅ Starter plan (1,000 leads limit)
- ✅ 999 leads already stored

**Steps:**
1. Go to campaign that captures leads
2. Generate 2 new leads
3. First lead should be captured
4. Second lead should be rejected

**Expected Result:**
```
Lead 1000: ✅ Stored successfully
Lead 1001: ❌ Rejected - "Plan limit exceeded"
Error logged: "Lead quota exceeded for tenant"
Lead not stored in database
```

---

## Webhook Testing

### Check Webhook Delivery

**Steps:**
1. Go to https://dashboard.stripe.com/webhooks
2. Click your endpoint: `localhost:3000/api/v1/webhooks/stripe`
3. Scroll to "Events" section
4. Run a checkout flow
5. Refresh events list

**Expected Events:**
```
✅ checkout.session.created
✅ checkout.session.completed
✅ customer.subscription.created or customer.subscription.updated
✅ All should show Status: "200" (green checkmark)
```

### Debug Webhook Issues

If webhooks show red ❌:

**Check API logs:**
```bash
# Terminal where API is running
# Should see: "Webhook event processed: checkout.session.completed"
```

**Test webhook manually:**
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=123456789,v1=test_signature" \
  -d '{"type":"checkout.session.completed"}'

# Expected response: 400 (signature validation will fail with test signature)
# But confirms endpoint is accessible
```

---

## Database Verification Queries

### View All Subscriptions
```sql
SELECT
  "tenantId",
  "plan",
  "status",
  "stripeCustomerId",
  "currentPeriodStart",
  "currentPeriodEnd"
FROM "Subscription"
ORDER BY "createdAt" DESC;
```

### Check Specific Tenant
```sql
SELECT * FROM "Subscription"
WHERE "tenantId" = 'abc123...';
```

### View Stripe Customer
```sql
SELECT
  c."name",
  c."email",
  s."plan",
  s."status",
  s."stripeCustomerId"
FROM "Company" c
JOIN "Subscription" s ON c."tenantId" = s."tenantId"
WHERE s."stripeCustomerId" IS NOT NULL;
```

---

## Common Issues & Solutions

### Issue: Checkout page shows "Stripe is not configured"
**Cause:** `STRIPE_SECRET_KEY` not set in API `.env`
**Fix:**
```bash
# 1. Add key to apps/api/.env
STRIPE_SECRET_KEY="sk_test_..."

# 2. Restart API server
# 3. Try checkout again
```

### Issue: "Payment succeeded but subscription not in database"
**Cause:** Webhook not processed
**Fix:**
```bash
# 1. Verify STRIPE_WEBHOOK_SECRET in .env
# 2. Check webhook endpoint in Stripe dashboard is correct
# 3. Look at webhook event delivery logs in Stripe dashboard
# 4. Check API logs for errors
```

### Issue: Stripe form not showing on checkout page
**Cause:** `VITE_STRIPE_PUBLISHABLE_KEY` not set in web `.env`
**Fix:**
```bash
# 1. Add key to apps/web/.env
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# 2. Restart web dev server
# 3. Hard refresh browser (Ctrl+Shift+R)
```

### Issue: Can't access Stripe portal
**Cause:** Missing `stripeCustomerId` in database
**Fix:**
```bash
# Manually set it:
UPDATE "Subscription"
SET "stripeCustomerId" = 'cus_...'
WHERE "tenantId" = 'abc123...';
```

---

## Performance Metrics

After completing all tests, verify:

| Metric | Expected | Actual |
|--------|----------|--------|
| Checkout completion | < 5 seconds | |
| Webhook delivery | < 2 seconds | |
| Database update | < 1 second | |
| Plan enforcement | < 100ms | |
| Subscription retrieval | < 500ms | |

---

## Sign-Off Checklist

- [ ] ✅ Scenario 1: Sign up & billing page loads
- [ ] ✅ Scenario 2: Successful payment (test card)
- [ ] ✅ Scenario 3: Payment decline handling
- [ ] ✅ Scenario 4: Campaign limit enforcement
- [ ] ✅ Scenario 5: Manage subscription portal
- [ ] ✅ Scenario 6: Plan upgrade
- [ ] ✅ Scenario 7: Cancellation
- [ ] ✅ Scenario 8: Lead limit enforcement
- [ ] ✅ Webhooks delivering successfully
- [ ] ✅ Database records correct
- [ ] ✅ No console errors
- [ ] ✅ All error messages user-friendly

---

## Next: Production Migration

When ready for production:
1. Switch Stripe to **Live mode**
2. Update `BASE_URL` to production domain
3. Update webhook endpoint to production
4. Use LIVE API keys (starts with `sk_live_`, `pk_live_`)
5. Test with real card (small amount like $1)
6. Monitor webhook deliveries
7. Enable email receipts in Stripe
