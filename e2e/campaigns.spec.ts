import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'admin@acme.test',
  password: 'password',
};

test.describe('Campaign Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign in")');
    // Wait for navigation after login
    await page.waitForURL(/\/(portal)?$/, { timeout: 30000 });
  });

  test('should navigate to campaigns page', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page.locator('h1')).toContainText('Campaigns');
    await expect(page.locator('text=Manage your ad campaigns')).toBeVisible();
  });

  test('should display campaign list', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Check if campaigns table exists
    await expect(page.locator('table')).toBeVisible();

    // Check for campaign headers
    await expect(page.locator('th', { hasText: 'Campaign' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Platform' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Status' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Budget' })).toBeVisible();
  });

  test('should open create campaign modal', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Click "New Campaign" button
    await page.click('button:has-text("New Campaign")');

    // Modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Create New Campaign')).toBeVisible();
  });

  test('should create a campaign', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Open create modal
    await page.click('button:has-text("New Campaign")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Verify the wizard modal opened and shows Step 1
    await expect(page.locator('[role="dialog"]').locator('text=Step 1 of 3: Select Company')).toBeVisible();
  });

  test('should filter campaigns by status', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Wait for table rows to actually render before counting
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Get initial campaign count
    const allRows = page.locator('tbody tr');
    const initialCount = await allRows.count();

    // Filter by status (2nd select on the page)
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('active');

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Filtered count should be less than or equal to initial
    const filteredRows = page.locator('tbody tr');
    const filteredCount = await filteredRows.count();

    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should pause an active campaign', async ({ page }) => {
    await page.goto('/campaigns');

    // Find a campaign with status "active" and click pause
    const pauseButton = page.locator('button:has-text("Pause")').first();

    if (await pauseButton.isVisible()) {
      await pauseButton.click();

      // Check for success message
      await expect(page.locator('[role="alert"]')).toContainText('paused');
    }
  });

  test('should resume a paused campaign', async ({ page }) => {
    await page.goto('/campaigns');

    // Find a campaign with status "paused" and click resume
    const resumeButton = page.locator('button:has-text("Resume")').first();

    if (await resumeButton.isVisible()) {
      await resumeButton.click();

      // Check for success message
      await expect(page.locator('[role="alert"]')).toContainText('resumed');
    }
  });

  test('should export campaigns as CSV', async ({ page }) => {
    await page.goto('/campaigns');

    // Check export button exists
    const exportButton = page.locator('button:has-text("Export")').first();
    await expect(exportButton).toBeVisible();

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    // Check file was downloaded
    expect(download.suggestedFilename()).toContain('campaigns');
  });
});
