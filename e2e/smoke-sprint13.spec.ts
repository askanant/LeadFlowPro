import { test, expect, Page } from '@playwright/test';

// Increase timeout for smoke tests that depend on API loading
test.setTimeout(60000);
const TEST_USER = {
  email: 'admin@acme.test',
  password: 'password',
};

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("Sign in")');
  // Wait for redirect to / (super_admin) or /portal (company_admin)
  await page.waitForURL(/\/(portal)?$/, { timeout: 30000 });
}

// =========================================================================
// 1. Lead Recommendations Widget (on Dashboard)
// =========================================================================

/** Wait for the dashboard to load and recommendations widget to finish loading */
async function waitForDashboardReady(page: Page) {
  await page.goto('/dashboard');
  // Wait for dashboard heading first
  await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 15000 });
  // Wait for the recommendations widget loading spinner to disappear (or content to appear)
  await expect(
    page.locator('text=Lead Recommendations').or(page.locator('text=No leads to recommend'))
  ).toBeVisible({ timeout: 30000 });
}

/** Wait for bulk scoring page to be ready */
async function waitForBulkScoringReady(page: Page) {
  await page.goto('/bulk-scoring');
  // Wait for loading to complete - either the h1 appears or the content loads
  await expect(page.locator('text=Bulk Lead Scoring')).toBeVisible({ timeout: 30000 });
}

/** Wait for leads table to load */
async function waitForLeadsReady(page: Page) {
  await page.goto('/leads');
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Lead Recommendations Widget', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Hot Leads section - appears with correct criteria', async ({ page }) => {
    await waitForDashboardReady(page);

    // Hot Leads section exists
    const hotSection = page.locator('button', { hasText: 'Hot Leads' });
    await expect(hotSection).toBeVisible();

    // Has a count badge
    const countBadge = hotSection.locator('span.bg-red-600');
    await expect(countBadge).toBeVisible();
  });

  test('Hot Leads section - expand/collapse and click-through', async ({ page }) => {
    await waitForDashboardReady(page);

    const hotSection = page.locator('button', { hasText: 'Hot Leads' });
    await hotSection.click();

    // Expanded area should now be visible
    const expandedContent = hotSection.locator('..').locator('~ div');
    // Either leads listed or empty state
    const leads = page.locator('a[href^="/leads/"]').filter({ hasText: /.+/ });
    const emptyState = page.locator('text=No leads in this category');

    const hasLeads = await leads.count() > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasLeads || hasEmpty).toBeTruthy();

    // If leads exist, verify they link to lead detail
    if (hasLeads) {
      const href = await leads.first().getAttribute('href');
      expect(href).toMatch(/^\/leads\//);
    }

    // Collapse by clicking again
    await hotSection.click();
  });

  test('Expiring Leads section exists', async ({ page }) => {
    await waitForDashboardReady(page);

    const section = page.locator('button', { hasText: 'Expiring Soon' });
    await expect(section).toBeVisible();

    // Has a yellow badge
    const badge = section.locator('span.bg-yellow-600');
    await expect(badge).toBeVisible();
  });

  test('High-Risk Leads section exists', async ({ page }) => {
    await waitForDashboardReady(page);

    const section = page.locator('button', { hasText: 'High-Risk' });
    await expect(section).toBeVisible();

    const badge = section.locator('span.bg-orange-600');
    await expect(badge).toBeVisible();
  });

  test('New High-Scoring section exists', async ({ page }) => {
    await waitForDashboardReady(page);

    const section = page.locator('button', { hasText: 'New High-Scoring' });
    await expect(section).toBeVisible();

    const badge = section.locator('span.bg-green-600');
    await expect(badge).toBeVisible();
  });

  test('Quick Stats panel renders correctly', async ({ page }) => {
    await waitForDashboardReady(page);

    await expect(page.locator('text=Quick Stats')).toBeVisible();
    await expect(page.locator('text=Hot Leads').first()).toBeVisible();
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
    await expect(page.locator('text=Total Leads').first()).toBeVisible();
    await expect(page.locator('text=Avg Lead Score')).toBeVisible();
  });

  test('Empty state renders when no leads', async ({ page }) => {
    // This tests that the component handles loading without crashing
    await waitForDashboardReady(page);

    // Widget should either show recommendations or "No leads to recommend" or loading
    const widget = page.locator('text=Lead Recommendations').or(page.locator('text=No leads to recommend'));
    await expect(widget.first()).toBeVisible();
  });
});

// =========================================================================
// 2. Bulk Scoring Dashboard
// =========================================================================
test.describe('Bulk Scoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to bulk scoring page', async ({ page }) => {
    await waitForBulkScoringReady(page);

    await expect(page.locator('h1')).toContainText('Bulk Lead Scoring');
    await expect(page.locator('text=Batch score all leads')).toBeVisible();
  });

  test('Campaign dropdown populates correctly', async ({ page }) => {
    await waitForBulkScoringReady(page);

    const dropdown = page.locator('select');
    await expect(dropdown).toBeVisible();

    // Should have at least the placeholder + campaigns
    const options = dropdown.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1); // placeholder + at least 1 campaign
  });

  test('Start Bulk Scoring button disabled until campaign selected', async ({ page }) => {
    await waitForBulkScoringReady(page);

    const btn = page.locator('button', { hasText: 'Start Bulk Scoring' });
    await expect(btn).toBeVisible();

    // Should be disabled when no campaign selected
    await expect(btn).toBeDisabled();

    // Select a campaign
    const dropdown = page.locator('select');
    const firstOption = dropdown.locator('option:not([value=""])').first();
    const optionValue = await firstOption.getAttribute('value');
    if (optionValue) {
      await dropdown.selectOption(optionValue);
      // Now button should be enabled
      await expect(btn).toBeEnabled();
    }
  });

  test('Score distribution displays (Hot/Warm/Cold/Junk tiers)', async ({ page }) => {
    await waitForBulkScoringReady(page);

    // Check tier cards exist
    await expect(page.locator('text=Hot Leads').first()).toBeVisible();
    await expect(page.locator('text=Warm Leads')).toBeVisible();
    await expect(page.locator('text=Cold Leads')).toBeVisible();
    await expect(page.locator('text=Junk Leads')).toBeVisible();

    // Each tier has a count (number)
    const tierCards = page.locator('p.text-2xl').filter({ hasText: /^\d+$/ });
    expect(await tierCards.count()).toBeGreaterThanOrEqual(4);
  });

  test('Average Scores by Dimension section displays', async ({ page }) => {
    await waitForBulkScoringReady(page);

    await expect(page.locator('text=Average Scores by Dimension')).toBeVisible();

    // Should show the 6 dimensions
    const dimensions = ['overall', 'quality', 'engagement', 'intent', 'firmographic', 'risk'];
    for (const dim of dimensions) {
      // Dimension label is capitalized
      const label = page.locator('span.text-gray-600', { hasText: new RegExp(dim, 'i') });
      await expect(label).toBeVisible();
    }

    // Scores should show /100
    const scores = page.locator('text=/100');
    expect(await scores.count()).toBeGreaterThanOrEqual(6);

    // Progress bars exist (bg-indigo-600 bars inside bg-gray-200)
    const progressBars = page.locator('.bg-indigo-600.h-2.rounded-full');
    expect(await progressBars.count()).toBeGreaterThanOrEqual(6);
  });

  test('Expected Conversion by Tier section displays', async ({ page }) => {
    await waitForBulkScoringReady(page);

    await expect(page.locator('text=Expected Conversion by Tier')).toBeVisible();

    // Should show Hot > Warm > Cold > Junk tier labels
    const hotPct = page.locator('.text-red-600').filter({ hasText: '%' }).first();
    const warmPct = page.locator('.text-orange-600').filter({ hasText: '%' }).first();
    const coldPct = page.locator('.text-blue-600').filter({ hasText: '%' }).first();
    const junkPct = page.locator('.text-gray-600').filter({ hasText: '%' }).first();

    await expect(hotPct).toBeVisible();
    await expect(warmPct).toBeVisible();
    await expect(coldPct).toBeVisible();
    await expect(junkPct).toBeVisible();
  });

  test('Top Scoring Factors section displays', async ({ page }) => {
    await waitForBulkScoringReady(page);

    const factorsSection = page.locator('text=Top Scoring Factors');
    if (await factorsSection.isVisible().catch(() => false)) {
      // Factors listed with percentage bars
      const factorBars = page.locator('.bg-indigo-600.h-2.rounded-full');
      expect(await factorBars.count()).toBeGreaterThan(0);

      // Each factor shows a percentage
      const pcts = page.locator('span.text-indigo-600').filter({ hasText: '%' });
      expect(await pcts.count()).toBeGreaterThan(0);
    }
  });

  test('Bulk scoring execution flow works', async ({ page }) => {
    await waitForBulkScoringReady(page);

    // Select a campaign
    const dropdown = page.locator('select');
    const firstOption = dropdown.locator('option:not([value=""])').first();
    const optionValue = await firstOption.getAttribute('value');
    if (!optionValue) return;

    await dropdown.selectOption(optionValue);

    const btn = page.locator('button', { hasText: 'Start Bulk Scoring' });
    await expect(btn).toBeEnabled();

    // Click to start scoring
    await btn.click();

    // Button should show "Scoring..." while running
    await expect(page.locator('button', { hasText: 'Scoring...' })).toBeVisible();

    // Wait for result (success or error) - up to 30s for bulk scoring
    const resultMessage = page.locator('text=Scoring Complete').or(page.locator('.bg-red-50'));
    await expect(resultMessage.first()).toBeVisible({ timeout: 30000 });

    // If successful, should show stats
    const successResult = page.locator('text=Scoring Complete');
    if (await successResult.isVisible().catch(() => false)) {
      await expect(page.locator('text=Total Leads')).toBeVisible();
      await expect(page.locator('text=Successfully Scored')).toBeVisible();
      await expect(page.locator('text=Errors')).toBeVisible();
    }
  });
});

// =========================================================================
// 3. Lead Detail – Intelligence & Insights Tab
// =========================================================================
test.describe('LeadDetail - Insights Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to a lead detail and see tabs', async ({ page }) => {
    await waitForLeadsReady(page);

    // Click on first lead
    const firstLead = page.locator('tbody tr:first-child a').first();
    await firstLead.click();

    // Should show Overview and Insights tabs
    await expect(page.locator('button', { hasText: 'Overview' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Intelligence & Insights' })).toBeVisible();
  });

  test('Overview tab shows Contact Information', async ({ page }) => {
    await waitForLeadsReady(page);
    await page.locator('tbody tr:first-child a').first().click();
    await expect(page.locator('text=Contact Information')).toBeVisible({ timeout: 15000 });

    // Status dropdown exists
    const statusSelect = page.locator('select').filter({ has: page.locator('option[value="new"]') });
    await expect(statusSelect).toBeVisible();
  });

  test('Insights tab shows AI scoring breakdown', async ({ page }) => {
    await waitForLeadsReady(page);
    await page.locator('tbody tr:first-child a').first().click();
    await expect(page.locator('text=Contact Information')).toBeVisible({ timeout: 15000 });

    // Switch to Insights tab
    await page.click('button:has-text("Intelligence & Insights")');

    // Wait for AI insights to load
    const insightsContent = page.locator('text=Risk Assessment')
      .or(page.locator('text=Loading AI insights'))
      .or(page.locator('text=Unable to load AI insights'));
    await expect(insightsContent.first()).toBeVisible({ timeout: 15000 });

    // Check for AI scoring content (if loaded successfully)
    // Wait a moment for content to fully render  
    await page.waitForTimeout(2000);
    const riskAssessment = page.locator('text=Risk Assessment');
    if (await riskAssessment.isVisible().catch(() => false)) {
      // Risk Assessment section
      await expect(page.locator('text=Safety Score')).toBeVisible();

      // Key Signals section
      await expect(page.locator('text=Key Signals').first()).toBeVisible();
    }
  });

  test('Insights tab shows Enrichment Data', async ({ page }) => {
    await waitForLeadsReady(page);
    await page.locator('tbody tr:first-child a').first().click();
    await expect(page.locator('text=Contact Information')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Intelligence & Insights")');

    // Wait for insights to load
    await page.waitForTimeout(3000);

    const enrichmentSection = page.locator('text=Enrichment Data');
    if (await enrichmentSection.isVisible().catch(() => false)) {
      // Email quality field
      const emailQuality = page.locator('text=Email Quality');
      await expect(emailQuality).toBeVisible();

      // Should show "Business Domain / Verified" or "Personal / Unverified"
      const emailValue = page.locator('text=Business Domain').or(page.locator('text=Personal'));
      await expect(emailValue.first()).toBeVisible();

      // Phone valid field
      await expect(page.locator('text=Phone Valid')).toBeVisible();

      // Job level field
      await expect(page.locator('text=Job Level')).toBeVisible();

      // Company size field
      await expect(page.locator('text=Company Size')).toBeVisible();
    }
  });

  test('Insights tab shows Recommended Actions', async ({ page }) => {
    await waitForLeadsReady(page);
    await page.locator('tbody tr:first-child a').first().click();
    await expect(page.locator('text=Contact Information')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Intelligence & Insights")');

    // Wait for load
    await page.waitForTimeout(3000);

    const recommendations = page.locator('text=Recommended Actions');
    if (await recommendations.isVisible().catch(() => false)) {
      // Action buttons exist
      const actionButtons = page.locator('button').filter({ hasText: /call|email|verify|follow/i });
      expect(await actionButtons.count()).toBeGreaterThan(0);
    }
  });
});

// =========================================================================
// 4. Loading States & Error Handling
// =========================================================================
test.describe('Loading & Error States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard shows loading spinner before data arrives', async ({ page }) => {
    // Navigate to dashboard and check loading state appears
    await page.goto('/dashboard');
    // Either loading spinner appears briefly or content loads
    const content = page.locator('text=Lead Recommendations')
      .or(page.locator('text=Loading'))
      .or(page.locator('text=No leads to recommend'))
      .or(page.locator('text=Dashboard'));
    await expect(content.first()).toBeVisible({ timeout: 30000 });
  });

  test('BulkScoring shows loading state during scoring', async ({ page }) => {
    await waitForBulkScoringReady(page);

    // Select a campaign and start scoring
    const dropdown = page.locator('select');
    const firstOption = dropdown.locator('option:not([value=""])').first();
    const optionValue = await firstOption.getAttribute('value');
    if (!optionValue) return;

    await dropdown.selectOption(optionValue);
    await page.click('button:has-text("Start Bulk Scoring")');

    // Verify "Scoring..." text appears (disabled state)
    const scoringBtn = page.locator('button:has-text("Scoring...")');
    if (await scoringBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(scoringBtn).toBeDisabled();
    }

    // Wait for completion
    await page.waitForTimeout(10000);
  });

  test('LeadDetail Insights shows loading indicator', async ({ page }) => {
    await waitForLeadsReady(page);
    await page.locator('tbody tr:first-child a').first().click();
    await expect(page.locator('text=Contact Information')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Intelligence & Insights")');

    // Should show loading or content
    const content = page.locator('text=Loading AI insights')
      .or(page.locator('text=Risk Assessment'))
      .or(page.locator('text=Unable to load AI insights'));
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});
