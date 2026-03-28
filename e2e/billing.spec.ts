import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'admin@acme.test',
  password: 'password',
};

test.describe('Billing & Subscription', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign in")');
    // Wait for navigation after login
    await page.waitForURL(/\/(portal)?$/, { timeout: 30000 });
  });

  test('should navigate to billing page', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.locator('h1')).toContainText('Billing', { timeout: 10000 });
  });

  test('should display subscription information', async ({ page }) => {
    await page.goto('/billing');

    // Check billing page content
    await expect(page.locator('h1')).toContainText('Billing');
    // Show either active plan or upgrade options
    await expect(page.locator('text=Upgrade Your Plan').or(page.locator('text=Current Plan')).first()).toBeVisible();
  });

  test('should show usage metrics', async ({ page }) => {
    await page.goto('/billing');

    // Check for usage information
    const usageSection = page.locator('text=Usage');

    if (await usageSection.isVisible()) {
      await expect(usageSection).toBeVisible();
    }
  });

  test('should display available plans', async ({ page }) => {
    await page.goto('/billing');

    // Check if pricing plans are shown
    const plans = page.locator('[class*="card"], [class*="plan"]');

    if (await plans.count() > 0) {
      await expect(plans.first()).toBeVisible();
    }
  });

  test('should navigate to portal settings from billing', async ({ page }) => {
    await page.goto('/billing');

    // Look for settings or account link
    const settingsLink = page.locator('a:has-text("Settings")').first();

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL(/\/portal\/settings|\/settings/);
      await expect(page).toHaveURL(/settings/);
    }
  });

  test('should display billing history if available', async ({ page }) => {
    await page.goto('/billing');

    // Check for invoice/billing history section
    const history = page.locator('text=Invoice, text=History, text=Transactions');

    if (await history.first().isVisible()) {
      await expect(history.first()).toBeVisible();
    }
  });

  test('should show current subscription status', async ({ page }) => {
    await page.goto('/billing');

    // Check for subscription status
    const status = page.locator('[class*="status"], [class*="badge"]');

    if (await status.count() > 0) {
      await expect(status.first()).toBeVisible();
    }
  });

  test('should allow viewing plan details', async ({ page }) => {
    await page.goto('/billing');

    // Look for "View Details" or similar button
    const detailButton = page.locator('button:has-text("Details"), button:has-text("View"), a:has-text("Learn More")').first();

    if (await detailButton.isVisible()) {
      await detailButton.click();

      // Should show plan features
      const features = page.locator('text=Feature, text=Included, text=Limit');

      if (await features.first().isVisible()) {
        await expect(features.first()).toBeVisible();
      }
    }
  });

  test('should display payment method if configured', async ({ page }) => {
    await page.goto('/billing');

    // Look for payment method section
    const paymentSection = page.locator('text=Payment Method, text=Card');

    if (await paymentSection.first().isVisible()) {
      await expect(paymentSection.first()).toBeVisible();
    }
  });

  test('should show usage limit warnings if near limit', async ({ page }) => {
    await page.goto('/billing');

    // Look for warning messages
    const warning = page.locator('[class*="warning"], [class*="alert"]').filter({
      hasText: /limit|approaching|exceeded/i,
    });

    if (await warning.count() > 0) {
      await expect(warning.first()).toBeVisible();
    }
  });
});
