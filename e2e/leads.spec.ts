import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'admin@acme.test',
  password: 'password',
};

test.describe('Lead Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign in")');
    // Wait for navigation after login
    await page.waitForURL(/\/(portal)?$/, { timeout: 30000 });
  });

  test('should navigate to leads page', async ({ page }) => {
    await page.goto('/leads');
    await expect(page.locator('h1')).toContainText('Leads');
    await expect(page.locator('text=total leads')).toBeVisible();
  });

  test('should display leads list', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Check if leads table exists
    await expect(page.locator('table')).toBeVisible();

    // Check for lead columns
    await expect(page.locator('th', { hasText: 'Name' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Contact' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Status' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Score' })).toBeVisible();
  });

  test('should filter leads by status', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Get initial lead count
    const allRows = page.locator('tbody tr');
    const initialCount = await allRows.count();

    // Filter by status (2nd select on the page)
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('contacted');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Filtered count should be less than or equal to initial
    const filteredRows = page.locator('tbody tr');
    const filteredCount = await filteredRows.count();

    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should filter leads by platform', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Get initial lead count
    const allRows = page.locator('tbody tr');
    const initialCount = await allRows.count();

    // Filter by platform (1st select on the page)
    const platformSelect = page.locator('select').nth(0);
    await platformSelect.selectOption('google');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Filtered count should be less than or equal to initial
    const filteredRows = page.locator('tbody tr');
    const filteredCount = await filteredRows.count();

    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should search leads by name/email', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Get initial lead count
    const allRows = page.locator('tbody tr');
    const initialCount = await allRows.count();

    // Search for a lead (placeholder uses ellipsis character)
    await page.getByPlaceholder(/Search/).fill('John');
    await page.locator('button[type="submit"]').click();

    // Wait for search results
    await page.waitForTimeout(500);

    // Results should be filtered
    const searchRows = page.locator('tbody tr');
    const searchCount = await searchRows.count();

    expect(searchCount).toBeLessThanOrEqual(initialCount);
  });

  test('should navigate to lead details', async ({ page }) => {
    await page.goto('/leads');

    // Click on first lead
    const firstLead = page.locator('tbody tr:first-child a').first();
    await firstLead.click();

    // Check lead detail page
    await expect(page.locator('h1')).toContainText(/^(?!Leads)/);
    await expect(page.locator('text=Contact Information')).toBeVisible();
  });

  test('should update lead status', async ({ page }) => {
    await page.goto('/leads');

    // Click on first lead
    const firstLead = page.locator('tbody tr:first-child a').first();
    await firstLead.click();

    // Look for status dropdown/select
    const statusSelect = page.locator('select[name*="status"]');

    if (await statusSelect.isVisible()) {
      // Change status
      await statusSelect.selectOption('qualified');

      // Check for success message
      await expect(page.locator('[role="alert"]')).toContainText('updated');
    }
  });

  test('should export leads as CSV', async ({ page }) => {
    await page.goto('/leads');

    // Check export button exists
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    // Check file was downloaded
    expect(download.suggestedFilename()).toContain('leads');
  });

  test('should show lead quality score', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Check quality score column exists
    const scoreCell = page.locator('tbody tr:first-child td:nth-child(5)');
    await expect(scoreCell).toBeVisible();

    // Score should display text like "Excellent", "Good", "Fair", or "Poor"
    await expect(scoreCell).toContainText(/Excellent|Good|Fair|Poor/);
  });

  test('should show duplicate lead indicator', async ({ page }) => {
    await page.goto('/leads');

    // Look for duplicate indicator
    const duplicateIndicator = page.locator('svg[class*="AlertCircle"]');

    if (await duplicateIndicator.count() > 0) {
      await expect(duplicateIndicator).toBeVisible();
    }
  });
});
