# UI Polish & Testing Plan - Sprint 13 Week 4

**Status**: ✅ Smoke Tests Complete (23/23 passing) | **Scope**: Lead Enrichment + Recommendations Widget + Bulk Scoring Dashboard  
**Timeline**: Tests complete by end of week  
**Automated E2E**: `e2e/smoke-sprint13.spec.ts` — 23 tests covering all 3 features

---

## Phase 1: Comprehensive Testing (Days 1-3)

### 1.1 Desktop Functional Tests

#### Lead Recommendations Widget
- [x] **Hot Leads Section**
  - [x] Appears with correct lead count (qualityScore ≥ 80)
  - [x] Sorted by score descending
  - [x] Each lead is clickable and navigates to LeadDetail
  - [x] Expand/collapse works smoothly
  - [x] Empty state shows message if no hot leads

- [x] **Expiring Leads Section**
  - [x] Shows leads received <48h ago with score ≥ 70
  - [x] Sorted by recency (newest first)
  - [x] Proper time calculation (no false positives)
  - [x] Collapse/expand transitions smooth

- [x] **High-Risk Leads Section**
  - [x] Flags generic domains (gmail, yahoo, hotmail, outlook)
  - [x] Flags leads without valid email
  - [x] Risk score calculation correct

- [x] **New High-Scoring Section**
  - [x] Shows leads from last 24 hours with score ≥ 75
  - [x] Most recent first
  - [x] Updates as new leads arrive

#### Bulk Scoring Dashboard
- [x] **Campaign Selection**
  - [x] Dropdown populates correctly
  - [x] Can select different campaigns
  - [x] "Start Bulk Scoring" button disabled until campaign selected

- [x] **Scoring Execution**
  - [x] Button shows "Scoring..." during operation
  - [x] Loading state is clear (UI not frozen)
  - [x] Results display correctly (success/error)
  - [x] Handles 100+ leads without performance issues

- [x] **Score Distribution Display**
  - [x] Tier counts accurate (Hot/Warm/Cold/Junk)
  - [x] Percentages calculate correctly
  - [x] Progress bars render smoothly

- [x] **Average Scores Section**
  - [x] All 6 dimensions display (Overall, Quality, Engagement, Intent, Firmographic, Risk)
  - [x] Scores out of 100 accurate
  - [x] Progress bars scale to 100%

- [x] **Conversion by Tier**
  - [x] Show expected conversion % for each tier
  - [x] Values reasonable (Hot > Warm > Cold > Junk)

- [x] **Top Scoring Factors**
  - [x] Lists top 5 factors affecting lead quality
  - [x] Percentages sum approximately to 100%
  - [x] Bar chart renders correctly

#### Lead Detail - Enrichment Tab
- [x] **Enrichment Data Display**
  - [x] Email quality shows "Business Domain / Verified" or "Personal / Unverified"
  - [x] Phone valid shows Yes/No
  - [x] Job level displays correctly
  - [x] Company size shows value
  - [ ] Linked-in URLs clickable (if present)

- [ ] **Competitor Risk Badge**
  - [ ] Shows on lead card if flagged as competitor
  - [ ] Color-coded (red/warning)
  - [ ] Hover tooltip explains risk reason

### 1.2 Mobile/Responsive Tests

**Devices to test**: iPhone 12, iPad, Android Galaxy S21

#### LeadRecommendationsWidget
- [ ] Sections stack vertically on mobile
- [ ] Lead items readable (no text overflow)
- [ ] Expand/collapse works on touch
- [ ] No horizontal scrolling needed

#### BulkScoringDashboard
- [ ] Layout stacks: controller left → bottom, analytics right → below
- [ ] Campaign dropdown full width on mobile
- [ ] Score distribution cards stack in 2-col grid on tablet, 1-col on phone
- [ ] Charts resize responsively
- [ ] Buttons have adequate touch targets (≥44px)

#### LeadDetail
- [ ] Enrichment data readable on small screens
- [ ] Competitor badge not cut off
- [ ] Icons visible and not too large

### 1.3 Loading & Error States

#### Scenarios to test:
- [x] **Slow network**: Throttle to 3G, verify loading spinners show
- [ ] **Network error**: Disable network, verify error messages appear
- [x] **Empty data**: Campaign with 0 leads, verify empty state
- [ ] **API timeout**: Simulate 5s delay, verify timeout handling
- [ ] **Partial failure**: Mock 1 lead failing in batch of 100, verify error count

### 1.4 Accessibility Tests

Using WAVE, Lighthouse, or manual testing:

- [ ] **Color contrast**
  - [ ] All text ≥ 4.5:1 ratio for normal text
  - [ ] Status badges readable (red/green sufficient)
  - [ ] No color-only information (use text labels too)

- [ ] **Keyboard navigation**
  - [ ] Tab through all interactive elements
  - [ ] Expand/collapse buttons respond to Enter/Space
  - [ ] Dropdown keyboard accessible
  - [ ] Focus visible (outline present)

- [ ] **Screen reader**
  - [ ] Sections labeled with aria-label if needed
  - [ ] Button purposes clear from text
  - [ ] Loading state announced
  - [ ] Error messages announced

- [ ] **Font sizing**
  - [ ] No text smaller than 12px
  - [ ] Headers clear hierarchy (h1 > h2)

---

## Phase 2: UI Polish (Days 2-4)

### 2.1 Visual Consistency

#### Alignment & Spacing
- [ ] All cards use consistent 6px base unit spacing
- [ ] Padding: 6px (xs), 12px (sm), 16px (md), 24px (lg)
- [ ] Gaps between components: 8px, 16px, or 24px
- [ ] Margins from viewport: 20px desktop, 16px mobile

#### Typography
- [ ] Page titles: 28-32px, bold
- [ ] Section headers: 16-18px, semibold
- [ ] Body text: 14px, regular
- [ ] Small text (labels): 12px, medium
- [ ] Monospace for scores/counts: 16-18px

#### Colors
- [ ] Hot tier: Red (#EF4444 or #DC2626)
- [ ] Warm tier: Orange (#F97316 or #EA580C)
- [ ] Cold tier: Blue (#3B82F6 or #2563EB)
- [ ] Junk tier: Gray (#9CA3AF or #6B7280)
- [ ] Success: Green (#10B981 or #059669)
- [ ] Background: White (#FFFFFF) on light mode
- [ ] Borders: #E5E7EB (light gray)

#### Icons
- [ ] All icons from lucide-react
- [ ] Icon sizing: 16px (inline), 18-20px (sections), 24px (headers)
- [ ] Color: Inherit from text or explicit color prop

### 2.2 Component Polish

#### LeadRecommendationsWidget
**Current state**: Polished
```
Polish checklist:
- [x] Even padding inside sections
- [x] Smooth expand/collapse animation (150-200ms)
- [x] Hover state on lead items (light gray background)
- [x] Stats panel (conversion rates) clearly separated
- [x] Loading spinner centered
- [x] Empty state text centered and italicized
```

#### BulkScoringDashboard
**Current state**: Polished
```
Polish checklist:
- [ ] Left panel (scoring) has shadow/border consistency
- [ ] Right panel breaks into sections with subtle dividers
- [ ] Score distribution cards use gradient backgrounds
- [ ] Progress bars have smooth color transitions
- [ ] Result success/error message has proper margin
- [ ] Button has active/pressed state visual feedback
- [ ] Dropdown styling matches form standards
```

#### LeadDetail Enrichment Tab
```
Polish checklist:
- [x] Tab styling matches global design
- [x] Enrichment fields in 2-col grid on desktop, 1-col on mobile
- [x] Field labels consistent font size
- [x] Field values bold/highlighted
- [x] Icons beside each field for quick scanning
- [x] Verified badges (email/phone) use checkmark icon + green color
```

### 2.3 Micro-interactions

#### Animations
- [x] Button click feedback: 50ms press, 100ms release
- [x] Section expand: 200ms easeOut (Tailwind transition-all)
- [x] Loading spinner: smooth continuous rotation
- [x] Error/success alert: fadeIn 150ms

#### Hover Effects
- [x] Lead items: background color lighten
- [x] Buttons: slight shadow/brightness increase
- [ ] Links: underline appear on hover
- [x] Cards: subtle shadow increase on hover

### 2.4 Error Message Polish

**Current**: Generic error messages  
**Target**: Contextual, actionable messages

```typescript
// Before:
"Failed to score leads"

// After:
"Failed to score 3 leads in campaign 'Q1 2026 Leads'. 
Check campaign leads and retry. (Error: Request timeout)"
```

Update error messages in:
- [ ] `apps/api/src/modules/ai/ai.router.ts` (POST /bulk-score error responses)
- [ ] `apps/web/src/api/ai.ts` (error handling in hooks)
- [ ] `apps/web/src/pages/BulkScoringDashboard.tsx` (error display)

### 2.5 Empty States

- [ ] **No leads**: Show helpful message + link to import
- [ ] **No campaigns**: Show message + link to create
- [ ] **Campaign with 0 leads**: "Select a campaign with leads to score"
- [ ] **No recommendations**: "Check back when leads arrive" + helpful tip

---

## Phase 3: Performance Testing (Day 3)

### 3.1 Load Performance

Using Chrome DevTools Lighthouse:

- [ ] **FCP (First Contentful Paint)**: < 2 seconds
- [ ] **LCP (Largest Contentful Paint)**: < 3 seconds
- [ ] **CLS (Cumulative Layout Shift)**: < 0.1
- [ ] **TTI (Time to Interactive)**: < 4 seconds

Test on:
- [ ] Fast 4G (100 Mbps)
- [ ] Slow 4G (10 Mbps)
- [ ] 3G (2 Mbps)

### 3.2 Runtime Performance

#### Bulk Scoring
- [ ] Scoring 100 leads: < 10 seconds
- [ ] Scoring 500 leads (max): < 45 seconds
- [ ] Memory usage stays < 100MB
- [ ] No memory leaks after 10 consecutive runs

#### Recommendations Widget
- [ ] Render time with 1000+ leads: < 500ms
- [ ] Filter/sort operations: < 200ms
- [ ] Smooth scrolling (60fps) when expanding sections

#### LeadDetail
- [ ] Load enrichment data: < 1 second
- [ ] Display enrichment tab: instant (< 100ms)

### 3.3 Bundle Size Impact

```bash
npm run build --workspace=apps/web
```

Expected gzip sizes:
- [ ] CSS: < 50 KB (currently 42.38 KB ✓)
- [ ] JS: < 1.2 MB (currently 1,010 KB ✓)
- [ ] Total: < 1.25 MB
- [ ] Charts/recharts not bloating bundle

---

## Phase 4: Cross-Browser Testing (Day 4)

Test on all supported browsers:

- [ ] **Chrome** (latest + 1 version back)
- [ ] **Firefox** (latest + 1 version back)
- [ ] **Safari** (latest + 1 version back)
- [ ] **Edge** (latest)

Per browser checklist:
- [ ] Dashboard layout intact
- [ ] Charts render (recharts compatibility)
- [ ] Colors display correctly
- [ ] No console errors
- [ ] Animations smooth

---

## Phase 5: E2E Test Suite (Days 3-4)

Create new E2E tests in `e2e/` directory:

### 5.1 Recommendations Widget Tests

File: `e2e/recommendations.spec.ts`

```typescript
test('Hot leads section displays correctly', async ({ page }) => {
  await page.goto('/dashboard');
  const section = page.locator('[data-testid="hot-leads-section"]');
  await expect(section).toBeVisible();
  // Verify leads are sorted by score descending
  // Verify click navigates to lead detail
});

test('Expanding sections smooth', async ({ page }) => {
  await page.goto('/dashboard');
  const button = page.locator('[data-testid="expand-hot-leads"]');
  await button.click();
  // Verify smooth animation (use waitForTimeout check)
  await page.waitForTimeout(300);
  // Verify content visible
});
```

### 5.2 Bulk Scoring Dashboard Tests

File: `e2e/bulk-scoring.spec.ts`

```typescript
test('Bulk scoring campaign selection and execution', async ({ page }) => {
  await page.goto('/bulk-scoring');
  
  // Select campaign
  await page.selectOption('[data-testid="campaign-select"]', 'campaign-1');
  
  // Click start button
  await page.click('[data-testid="start-bulk-score"]');
  
  // Wait for completion
  await page.waitForSelector('[data-testid="scoring-complete"]', { timeout: 60000 });
  
  // Verify results
  await expect(page.locator('[data-testid="total-leads"]')).toContainText(/[0-9]+/);
});

test('Score distribution displays correctly', async ({ page }) => {
  // Run bulk scoring, then verify distribution
  // Check Hot/Warm/Cold/Junk card values
  // Verify percentages sum to 100
});
```

### 5.3 Lead Detail Enrichment Tests

File: `e2e/lead-detail.spec.ts` (extend existing)

```typescript
test('Enrichment tab displays verified email correctly', async ({ page }) => {
  await page.goto('/leads/123'); // Lead with business email
  
  const enrichmentTab = page.locator('[data-testid="enrichment-tab"]');
  await enrichmentTab.click();
  
  await expect(page.locator('[data-testid="email-quality"]')).toContainText('Business Domain / Verified');
});

test('Competitor risk badge appears on flagged leads', async ({ page }) => {
  await page.goto('/leads/456'); // Lead flagged as competitor
  
  const badge = page.locator('[data-testid="competitor-badge"]');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('Competitor Risk');
});
```

### 5.4 Responsive Design Tests

File: `e2e/responsive.spec.ts`

```typescript
test('Dashboard responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); // iPhone 12
  
  await page.goto('/dashboard');
  
  // Verify widget stacks
  const widget = page.locator('[data-testid="recommendations-widget"]');
  const rect = await widget.boundingBox();
  expect(rect.width).toBeLessThanOrEqual(375 - 32); // With margins
  
  // Verify no horizontal scroll
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
```

---

## Testing Artifacts

### 5.1 Add Data Attributes for E2E Testing

Update components to add `data-testid` attributes:

```typescript
// BulkScoringDashboard.tsx
<select data-testid="campaign-select">
<button data-testid="start-bulk-score">

// LeadRecommendationsWidget.tsx
<div data-testid="hot-leads-section">
<button data-testid="expand-hot-leads">

// LeadDetail.tsx
<div data-testid="enrichment-tab">
<span data-testid="competitor-badge">
```

### 5.2 Update playwright.config.ts

```typescript
// Add gentle defaults for E2E tests
use: {
  ...
  actionTimeout: 10000,
  navigationTimeout: 30000,
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

---

## Testing Checklist - By Day

### Day 1 (Functional Testing)
- [ ] Desktop: All 3 features (widget, dashboard, enrichment)
- [ ] Load/error states
- [ ] Accessibility scan (WAVE)

### Day 2 (UI Polish + Mobile)
- [ ] Mobile responsive testing (375px, 768px, 1024px)
- [ ] Visual consistency pass
- [ ] Animation smoothness

### Day 3 (Performance)
- [ ] Lighthouse score ≥ 90
- [ ] Bundle size verified
- [ ] Runtime performance (100+ leads)
- [ ] E2E tests written (recommendations + bulk scoring)

### Day 4 (Cross-browser + Final)
- [ ] Chrome, Firefox, Safari, Edge
- [ ] E2E tests passing
- [ ] UI polish final pass
- [ ] Ready for production

---

## Sign-Off Criteria

✅ **All tests passing**:
- Unit tests (if any)
- E2E tests (≥80% scenarios covered)
- Manual functional tests
- Accessibility audit (no critical issues)

✅ **Performance targets met**:
- Lighthouse ≥ 90
- FCP < 2s, LCP < 3s
- No memory leaks

✅ **Visual consistency**:
- Design tokens applied
- Responsive on all breakpoints
- Cross-browser without console errors

✅ **Documentation**:
- Testing procedures documented in [TESTING_PROCEDURES.md](../TESTING_PROCEDURES.md)
- Known issues documented
- Deployment ready

---

## Reference

- **Design System**: Tailwind CSS 4.2.1
- **Icons**: lucide-react v0.577
- **Charts**: recharts v3.7.0
- **Testing Framework**: Playwright

See [TESTING_PROCEDURES.md](../TESTING_PROCEDURES.md) for running tests.
