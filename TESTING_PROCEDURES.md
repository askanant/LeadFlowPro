# Testing Procedures - LeadFlowPro Sprint 13 Week 4

**This document explains how to execute tests at each level.**

---

## Prerequisites

```bash
# Install dependencies
npm install

# Ensure both servers running
npm run dev --workspace=apps/api &      # Terminal 1
npm run dev --workspace=apps/web &      # Terminal 2

# Optional: Run DB seeders for test data
npm run seed --workspace=apps/api
```

---

## Level 1: Manual Functional Testing

### Desktop (Chrome DevTools)

#### 1. Test Recommendations Widget
```
1. Open http://localhost:5174/dashboard
2. Scroll to LeadRecommendationsWidget (below main stats)
3. Verify 4 sections visible:
   - 🔥 Hot Leads Needing Action
   - ⏰ Leads Expiring Soon
   - ⚠️ High-Risk Leads
   - ✨ New High-Scoring

4. Click to expand each section
5. Verify leads display with:
   - Lead name / email
   - Score / tier badge
   - Quick action buttons
6. Click a lead → verify navigation to LeadDetail
```

#### 2. Test Bulk Scoring Dashboard
```
1. Open http://localhost:5174/bulk-scoring
2. Left panel: Campaign selector
   - Dropdown populated with campaigns
   - Can select campaign
3. Click "Start Bulk Scoring" button
4. Observe:
   - Button shows "Scoring..."
   - UI not frozen (no long hang)
5. Wait for completion (< 10 sec for <100 leads)
6. Results display:
   - total leads count
   - Successfully scored count
   - Errors (if any)
7. Right panel: Score distribution
   - Hot/Warm/Cold/Junk cards with counts & %
   - Progress bars show ratios
   - Average scores by dimension
   - Conversion estimates
8. Scroll: Top scoring factors bar chart visible
```

#### 3. Test LeadDetail Enrichment
```
1. Open http://localhost:5174/leads
2. Click any lead
3. Scroll to "Enrichment" tab
4. Verify displays:
   - Email Quality: "Business Domain / Verified" or "Personal / Unverified"
   - Phone Valid: Yes/No icon
   - Job Level: C-level/Director/Manager/IC
   - Company Size: S/M/L/Enterprise
   - LinkedIn URLs (if present): clickable
5. If lead is competitor: Red badge with "Competitor Risk"
6. Hover over fields: tooltips appear (if implemented)
```

### Mobile Testing (Chrome DevTools)

```
1. Open DevTools (F12)
2. Click device toggle (mobile icon)
3. Set to:
   - iPhone 12 (375 x 812)
   - iPad (768 x 1024)
   - Galaxy S21 (360 x 800)

4. For each device, test:
   - No horizontal scrolling
   - Text readable (not cut off)
   - Buttons have adequate touch targets
   - Sections stack vertically
   - Images scale appropriately
```

---

## Level 2: Automated E2E Testing (Playwright)

### Setup

```bash
# Install Playwright if not done
npx playwright install

# Verify test data exists
npm run seed --workspace=apps/api
```

### Run All E2E Tests

```bash
# Run full test suite
npx playwright test

# Run verbose output
npx playwright test --reporter=verbose

# Run specific test file
npx playwright test e2e/recommendations.spec.ts

# Run in debug mode (step through)
npx playwright test --debug

# Run in headed mode (watch browser)
npx playwright test --headed
```

### View Test Report

```bash
# After tests complete, view HTML report
npx playwright show-report
```

Output shows:
- Pass/fail status per test
- Screenshots on failure
- Video recording of failures
- Trace files for debugging

### Write New E2E Tests

Create file: `e2e/recommendations.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Lead Recommendations Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5174/login');
    await page.fill('[name="email"]', 'admin@acme.test');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
  });

  test('displays hot leads section', async ({ page }) => {
    const heading = page.locator('text=🔥 Hot Leads Needing Action');
    await expect(heading).toBeVisible();
  });

  test('expands and collapses sections', async ({ page }) => {
    const button = page.locator('[data-testid="expand-hot-leads"]');
    
    // Initially collapsed
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    
    // Click to expand
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    
    // Content visible
    const content = page.locator('[data-testid="hot-leads-list"]');
    await expect(content).toBeVisible();
  });

  test('navigate to lead on click', async ({ page }) => {
    await page.locator('[data-testid="hot-leads-section"]').first().click();
    
    // Verify URL changed to lead detail
    await expect(page).toHaveURL(/\/leads\/\w+/);
  });
});
```

---

## Level 3: Accessibility Testing

### Automated (Lighthouse)

```bash
# Via Chrome DevTools
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Accessibility"
4. Click "Analyze page load"
5. View report:
   - Color contrast issues (should be ≥ 4.5:1)
   - Missing alt text
   - ARIA misuse
   - Form labels
```

### Manual (Keyboard + Screen Reader)

#### Keyboard Navigation
```
1. Press Tab repeatedly through page
2. Verify focus visible (blue outline)
3. Test interactive elements:
   - Buttons: press Enter/Space to activate
   - Dropdown: arrow keys to navigate, Enter to select
   - Expandable: Space to toggle expand
4. Test on:
   - Dashboard
   - Bulk Scoring page
   - Lead Detail
```

#### Screen Reader (NVDA on Windows)
```
1. Download NVDA: https://www.nvaccess.org/
2. Start NVDA and open browser
3. Navigate with:
   - H: jump to headings
   - L: jump to lists
   - B: jump to buttons
4. Verify:
   - Page structure clear (H1 > H2 hierarchy)
   - Button purposes announced
   - Form labels associated
   - Error messages announced
```

---

## Level 4: Performance Testing

### Lighthouse

```
1. In DevTools, select "Lighthouse" tab
2. Select:
   - Device: Mobile & Desktop
   - Categories: Performance, SEO, Best Practices
3. Click "Analyze page load"
4. Targets:
   - Performance: ≥ 90
   - First Contentful Paint (FCP): < 2s
   - Largest Contentful Paint (LCP): < 3s
   - Cumulative Layout Shift (CLS): < 0.1
```

### Network Throttling

```
1. Open DevTools → Network tab
2. Top dropdown: "No throttling" → select "Slow 4G"
3. Reload page: http://localhost:5174/dashboard
4. Observe:
   - Loading spinner appears
   - Page becomes interactive < 4s
   - No layout shift when widget loads
5. Repeat for Offline → verify error message shown
```

### Runtime Performance

```
1. Open DevTools → Performance tab
2. Record 60 seconds while:
   - Expanding recommendation sections
   - Scrolling dashboard
   - Clicking between sections
3. Analyze:
   - Frame rate: target ≥ 60fps
   - Task duration: target < 50ms
   - Look for jank (frame drops)
```

### Bulk Scoring Load Test

```bash
# Create 100 leads via API
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@acme.com"}'

# Then:
1. Open DevTools → Performance
2. Click "Start Bulk Scoring"
3. Record tab performance
4. Verify completes in < 10 seconds
5. Check memory doesn't grow unbounded
```

---

## Level 5: Cross-Browser Testing

### BrowserStack (Optional Paid)

If you have BrowserStack account:
```bash
npm install -g browserstack-local

# Upload to BrowserStack and test on:
# - Chrome 90, 95, 100 (latest 3 versions)
# - Firefox 88, 95, 100
# - Safari 14, 15, 16
# - Edge 90, 95, 100
```

### Free Alternative: Use Available Browsers

```
Firefox (free):
1. Download: https://www.mozilla.org/firefox/
2. Open http://localhost:5174/dashboard
3. Test same checklist as Chrome

Safari (Mac only):
1. Open http://localhost:5174/dashboard
2. Verify pages load

Edge (Windows):
1. Download: https://www.microsoft.com/edge
2. Open http://localhost:5174/dashboard
3. Verify responsive design
```

---

## Level 6: Visual Regression Testing

### Manual Screenshot Comparison

```
1. Take screenshots before & after changes
2. Tools:
   - Chrome: Right-click → Screenshot
   - macOS: Cmd+Shift+5
   - Windows: Print Screen or Snip & Sketch
3. Compare:
   - Colors match design tokens
   - Alignment correct
   - No text overflow
   - Icons display properly

4. Save to: docs/screenshots/ for documentation
```

### (Advanced) Percyapp Integration

```bash
# If using Percy for visual regression:
npm install --save-dev @percy/cli @percy/playwright

# Update playwright config
# Run tests with Percy:
percy exec -- npx playwright test
```

---

## Checklist: Daily Test Execution

### Morning (Smoke Test - 10 min)
```
- [ ] npm run dev --workspace=apps/api
- [ ] npm run dev --workspace=apps/web
- [ ] Open http://localhost:5174/dashboard
- [ ] Verify:
  - Dashboard loads (no 404/500)
  - Recommendations widget visible
  - No console errors (DevTools)
- [ ] Open http://localhost:5174/bulk-scoring
- [ ] Verify page loads, no errors
```

### Before Merge (Full Test - 30-45 min)
```
- [ ] npm run build (compilation succeeds)
- [ ] npm run audit:dependencies (no high vulnerabilities)
- [ ] npx playwright test e2e/recommendations.spec.ts (pass)
- [ ] npx playwright test e2e/bulk-scoring.spec.ts (pass)
- [ ] Lighthouse desktop ≥ 90
- [ ] Lighthouse mobile ≥ 85
- [ ] Manual: Test all 3 features end-to-end
- [ ] Keyboard navigation works
```

### Before Deploy (Final - 1 hour)
```
- [ ] Full E2E test suite passes: npx playwright test
- [ ] No known issues in console
- [ ] Performance acceptable under load
- [ ] Cross-browser checklist (Chrome/Firefox/Safari/Edge)
- [ ] Mobile (iPhone/iPad/Android) responsive
- [ ] Accessibility: WAVE scan ≥ 95
- [ ] All 3 major features working together
- [ ] Rollback procedure documented
```

---

## Debugging Failed Tests

### E2E Test Failed?

```bash
# 1. Run in debug mode
npx playwright test e2e/recommendations.spec.ts --debug

# 2. Check screenshots
ls -la test-results/

# 3. View trace file
npx playwright show-trace test-results/trace.zip

# 4. Common issues:
# - Selector not found: Verify data-testid exists in component
# - Timeout: Increase timeout or add explicit wait
# - Login failed: Verify test credentials work
```

### Performance Bad?

```
1. Check Network tab for slow requests
2. Profile with Performance tab:
   - Are API calls taking time?
   - Are re-renders happening?
3. Run audit:
   - npm run audit:dependencies
   - Check for bloated libraries
4. Check source maps in production build
```

### Accessibility Issues?

```
1. Run Lighthouse Accessibility audit in DevTools
2. Use WAVE browser extension: https://wave.webaim.org/extension/
3. Common fixes:
   - Add aria-label to buttons
   - Add role attributes
   - Add alt text to images
   - Ensure color contrast ≥ 4.5:1
```

---

## Test Data Management

### Seeding Test Data

```bash
# Seed demo tenant with leads
npm run seed --workspace=apps/api

# Creates:
# - 1 test company (ACME)
# - 15 test campaigns
# - 187 test leads with various scores
```

### Resetting Test Data

```bash
# Reset Neon database
npx prisma db push --skip-generate --force-reset

# Re-seed
npm run seed --workspace=apps/api
```

---

## Continuous Integration

### Add to GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install
      - run: npm run build
      - run: npx playwright test
```

---

**Questions?** See [TESTING_PLAN_WEEK4.md](TESTING_PLAN_WEEK4.md) for comprehensive plan.
