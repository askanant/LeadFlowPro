/**
 * Stripe Integration Test Script
 * Verifies all Stripe components are properly configured
 *
 * Run: npx tsx scripts/test-stripe-integration.ts
 */

import Stripe from 'stripe';
import { config } from '../src/config';
import { prisma } from '../src/shared/database/prisma';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testStripeIntegration() {
  log('\n🔍 Stripe Integration Test\n', colors.blue);

  let passed = 0;
  let failed = 0;

  // Test 1: Check environment variables
  log('Test 1: Environment Variables', colors.blue);
  if (!config.STRIPE_SECRET_KEY) {
    log('❌ STRIPE_SECRET_KEY is not set', colors.red);
    failed++;
  } else {
    log(`✅ STRIPE_SECRET_KEY is set (${config.STRIPE_SECRET_KEY.substring(0, 20)}...)`, colors.green);
    passed++;
  }

  if (!config.STRIPE_PUBLISHABLE_KEY) {
    log('⚠️  STRIPE_PUBLISHABLE_KEY is not set (needed for web frontend)', colors.yellow);
  } else {
    log(`✅ STRIPE_PUBLISHABLE_KEY is set (${config.STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...)`, colors.green);
    passed++;
  }

  if (!config.STRIPE_WEBHOOK_SECRET) {
    log('⚠️  STRIPE_WEBHOOK_SECRET is not set (webhooks will fail)', colors.yellow);
  } else {
    log(`✅ STRIPE_WEBHOOK_SECRET is set (${config.STRIPE_WEBHOOK_SECRET.substring(0, 20)}...)`, colors.green);
    passed++;
  }

  // Test 2: Initialize Stripe client
  log('\nTest 2: Stripe Client Initialization', colors.blue);
  let stripe: Stripe | null = null;
  try {
    if (config.STRIPE_SECRET_KEY) {
      stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
      log('✅ Stripe client initialized successfully', colors.green);
      passed++;
    }
  } catch (error) {
    log(`❌ Failed to initialize Stripe client: ${(error as Error).message}`, colors.red);
    failed++;
  }

  // Test 3: Verify database schema
  log('\nTest 3: Database Schema', colors.blue);
  try {
    // Check if subscription table exists by attempting a query
    const subscriptionCount = await prisma.subscription.count();
    log(`✅ Subscription table exists (${subscriptionCount} records)`, colors.green);
    passed++;

    // Check fields
    const sampleSubscription = await prisma.subscription.findFirst();
    if (sampleSubscription) {
      const requiredFields = ['tenantId', 'plan', 'status', 'stripeCustomerId', 'stripeSubscriptionId'];
      const hasAllFields = requiredFields.every((field) => field in sampleSubscription);
      if (hasAllFields) {
        log('✅ All required subscription fields exist', colors.green);
        passed++;
      } else {
        log(`❌ Missing some required fields. Found: ${Object.keys(sampleSubscription).join(', ')}`, colors.red);
        failed++;
      }
    } else {
      log('✅ Subscription table exists (empty)', colors.green);
      passed++;
    }
  } catch (error) {
    log(`❌ Database schema issue: ${(error as Error).message}`, colors.red);
    failed++;
  }

  // Test 4: Test Stripe API connectivity
  log('\nTest 4: Stripe API Connectivity', colors.blue);
  if (stripe) {
    try {
      const plans = await stripe.plans.list({ limit: 1 });
      log(`✅ Connected to Stripe API successfully`, colors.green);
      log(`   Found ${plans.data.length} existing plans`, colors.green);
      passed++;
    } catch (error) {
      log(`❌ Failed to connect to Stripe API: ${(error as Error).message}`, colors.red);
      failed++;
    }
  } else {
    log('⏭️  Skipped (STRIPE_SECRET_KEY not configured)', colors.yellow);
  }

  // Test 5: Verify webhook endpoint
  log('\nTest 5: Webhook Configuration', colors.blue);
  if (config.STRIPE_WEBHOOK_SECRET) {
    log('✅ STRIPE_WEBHOOK_SECRET is configured', colors.green);
    log('   Webhook endpoint: POST /api/v1/webhooks/stripe', colors.green);
    passed++;
  } else {
    log('⚠️  STRIPE_WEBHOOK_SECRET not configured - webhooks will not work', colors.yellow);
    log('   To setup webhooks:', colors.yellow);
    log('   1. Go to https://dashboard.stripe.com/webhooks', colors.yellow);
    log('   2. Create endpoint: http://localhost:3000/api/v1/webhooks/stripe', colors.yellow);
    log('   3. Copy the signing secret to STRIPE_WEBHOOK_SECRET', colors.yellow);
  }

  // Test 6: Verify billing service
  log('\nTest 6: Billing Service', colors.blue);
  try {
    const { billingService } = await import('../src/modules/billing/billing.service');
    const plans = billingService.getPlans();
    if (plans && plans.length > 0) {
      log(`✅ Billing service working - ${plans.length} plans defined`, colors.green);
      log(`   Plans: ${plans.map((p) => p.id).join(', ')}`, colors.green);
      passed++;
    } else {
      log('❌ No billing plans defined', colors.red);
      failed++;
    }
  } catch (error) {
    log(`❌ Failed to load billing service: ${(error as Error).message}`, colors.red);
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(50), colors.blue);
  log(`Tests Passed: ${passed}`, colors.green);
  log(`Tests Failed: ${failed}`, colors.red);
  log('='.repeat(50) + '\n', colors.blue);

  if (failed === 0) {
    log('✅ All tests passed! Stripe integration is ready.', colors.green);
    log('\nNext steps:', colors.green);
    log('1. Get Stripe test keys from https://dashboard.stripe.com/developers/api', colors.green);
    log('2. Update STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env', colors.green);
    log('3. Create webhook endpoint at https://dashboard.stripe.com/webhooks', colors.green);
    log('4. Update STRIPE_WEBHOOK_SECRET with webhook signing secret', colors.green);
    log('5. Restart the API server', colors.green);
  } else {
    log(`⚠️  ${failed} issue(s) found. See errors above.`, colors.yellow);
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

testStripeIntegration().catch((error) => {
  log(`\n❌ Test failed with error:`, colors.red);
  console.error(error);
  process.exit(1);
});
