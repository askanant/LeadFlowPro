# Week 4 Testing - Day 1 Smoke Test Report

**Date**: March 15, 2026  
**Status**: ✅ Servers Running | ⏳ Functional Testing  
**Tested By**: Automated Setup

---

## ✅ Infrastructure Status

| Component | Port | Status | Details |
|-----------|------|--------|---------|
| API Server | 3000 | 🟢 Running | Process listening, routes responding |
| Web Server | 5176 | 🟢 Running | Status 200, React app mounted |
| Database | Neon | 🟢 Connected | Via .env (not tested directly) |
| Redis | 6379 | 🟢 Assumed | No error logs |

**URLs Ready for Testing:**
- **Dashboard**: http://localhost:5176/dashboard
- **Bulk Scoring**: http://localhost:5176/bulk-scoring  
- **Lead Detail**: http://localhost:5176/leads/[ID]

---

## 📋 Manual Smoke Test Checklist

### Phase 1: Dashboard & Recommendations Widget (10 min)

**How to Test:**
```
1. Open http://localhost:5176/dashboard in Chrome
2. Scroll down to "LeadRecommendationsWidget" section
3. Execute checklist below:
```

#### Tests:
- [ ] **Widget Visible**
  - Recommendations widget appears below main stats
  - No 404 or JavaScript errors (DevTools → Console)
  
- [ ] **Section Structure**  
  - [ ] See 4 sections: Hot Leads | Expiring Soon | High-Risk | New High-Scoring
  - [ ] Each section has expand/collapse button
  - [ ] Section titles visible

- [ ] **Hot Leads Section**
  - [ ] Click expand button
  - [ ] Leads appear with: Name, Email, Score, Status badge
  - [ ] Leads sorted by score (highest first)
  - [ ] Click a lead → navigates to /leads/[ID]

- [ ] **Expiring Leads Section**
  - [ ] Expand
  - [ ] Shows leads received < 48 hours ago
  - [ ] Sorted by newest first
  - [ ] Each has clickable link

- [ ] **High-Risk Section**
  - [ ] Flags generic emails (gmail, yahoo, hotmail, outlook)
  - [ ] Also shows leads without valid email
  - [ ] Risk indicator visible

- [ ] **New High-Scoring Section**
  - [ ] Shows leads from last 24 hours
  - [ ] Score ≥ 75
  - [ ] Most recent first

- [ ] **Animations**
  - [ ] Expand/collapse smooth (not instant)
  - [ ] No flashing/flickering
  - [ ] Transition speed reasonable (~200ms)

### Phase 2: Bulk Scoring Dashboard (10 min)

**How to Test:**
```
1. Open http://localhost:5176/bulk-scoring
2. Execute checklist below:
```

#### Tests:
- [ ] **Page Loads**
  - [ ] No 404, 500, or JavaScript errors
  - [ ] "Back" link visible (to dashboard)
  - [ ] Page title displays correctly

- [ ] **Campaign Selection**
  - [ ] Campaign dropdown shows campaigns
  - [ ] Can select different campaigns
  - [ ] "Start Bulk Scoring" button disabled until campaign selected

- [ ] **Bulk Scoring Execution**
  - [ ] Select a campaign
  - [ ] Click "Start Bulk Scoring"
  - [ ] Button shows "Scoring..." during operation
  - [ ] UI remains responsive (can scroll, etc.)
  - [ ] Completes in < 15 seconds (for <100 leads)

- [ ] **Results Display**
  - [ ] Success message shows:
    - Total Leads count
    - Successfully Scored count
    - Errors (if any)
  - [ ] Error message (if failed) is informative

- [ ] **Score Distribution Cards**
  - [ ] 4 cards visible: Hot | Warm | Cold | Junk
  - [ ] Each shows: Count + Percentage
  - [ ] Percentages sum to 100%
  - [ ] Background colors correct (red/orange/blue/gray)

- [ ] **Average Scores by Dimension**
  - [ ] 6 dimensions visible: Overall, Quality, Engagement, Intent, Firmographic, Risk
  - [ ] Each score 0-100
  - [ ] Progress bars fill correctly

- [ ] **Conversion by Tier**
  - [ ] Shows expected conversion % for each tier
  - [ ] Hot > Warm > Cold > Junk (higher conversion for hot)

- [ ] **Top Scoring Factors**
  - [ ] Bar chart displays top 5 factors
  - [ ] Percentages reasonable

### Phase 3: Lead Detail - Enrichment (10 min)

**How to Test:**
```
1. From Dashboard, click any lead
2. Scroll to "Enrichment" tab
3. Execute checklist below:
```

#### Tests:
- [ ] **Enrichment Tab Visible**
  - [ ] Tab appears in lead detail page
  - [ ] Tab label shows "Enrichment" or similar

- [ ] **Enrichment Data Displays**
  - [ ] Email Quality: Shows "Business Domain / Verified" OR "Personal / Unverified"
  - [ ] Phone Valid: Shows "Yes" or "No"
  - [ ] Job Level: Shows category (C-level, Director, Manager, IC, or Unknown)
  - [ ] Company Size: Shows size (S/M/L/Enterprise or Unknown)
  - [ ] LinkedIn URLs: Clickable if present

- [ ] **Competitor Risk Badge**
  - [ ] If lead flagged as competitor: Red badge with "Competitor Risk" label
  - [ ] Click to show details
  - [ ] Explains which signals matched (email domain, company name, etc.)

- [ ] **Data Accuracy**
  - [ ] Values match actual lead data
  - [ ] No "undefined" or "null" showing
  - [ ] Formatting clean (emails lowercase, etc.)

---

## 🧪 Automated Testing Setup

### E2E Test Framework
- ✅ Playwright installed
- ✅ Browsers downloading (Chrome, Firefox, Safari, Chromium)
- ⏳ Ready to run tests (once browsers finish)

### To Run E2E Tests (Once Ready):
```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run in headed mode (watch browser)
npx playwright test --headed

# View test report
npx playwright show-report
```

---

## 📊 Performance Check (Manual)

### Lighthouse Audit
```
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Desktop" + all categories
4. Click "Analyze page load"
5. Take screenshot of results

Targets:
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90
```

### Network Performance
```
1. DevTools → Network tab
2. Set throttle to "Slow 4G"
3. Reload dashboard
4. Measure:
   - Time to interactive: target < 4s
   - No long tasks > 50ms
5. Check for failed requests (red)
```

---

## 📱 Mobile Responsive Check

```
1. DevTools → Click device toggle (phone icon)
2. Select iPhone 12 (375 x 812)
3. For each page, verify:
   - [ ] No horizontal scrolling
   - [ ] Text readable (not tiny)
   - [ ] Buttons tappable (≥44px height)
   - [ ] Sections stack vertically
4. Repeat for iPad (768 x 1024)
```

---

## ✅ Sign-Off Checklist for Day 1

When all below are ✅, proceed to Day 2 UI Polish:

- [ ] Dashboard loads without errors
- [ ] Recommendations widget visible & functional
- [ ] All 4 sections expand/collapse correctly
- [ ] Can click leads and navigate
- [ ] Bulk Scoring page loads
- [ ] Campaign selection works
- [ ] Bulk scoring executes successfully
- [ ] Score distribution displays correctly
- [ ] Lead Detail page loads
- [ ] Enrichment tab shows data
- [ ] Competitor badge appears (if applicable)
- [ ] Mobile responsive (375px test)
- [ ] No 404/500 errors in console
- [ ] No unhandled JavaScript errors

---

## 📝 Issues Found

| # | Issue | Severity | Link |
|---|-------|----------|------|
| — | None found yet (Smoke test incomplete) | — | — |

**Add issues here as found**: [TESTING_ISSUES.md](TESTING_ISSUES.md)

---

## Next Steps

### ✅ After Manual Smoke Test Complete:
1. Update this report with findings
2. Log any issues in TESTING_ISSUES.md
3. Proceed to Day 2: **UI Polish** (animations, spacing, consistency)

### 🚀 TODO:
- [ ] Complete manual smoke tests (all checklist items)
- [ ] Run Lighthouse audit → document scores
- [ ] Run E2E tests once Playwright ready
- [ ] Test on mobile (375px viewport)
- [ ] Get approval to proceed to Day 2

---

**Status Summary:**
- ✅ Infrastructure ready (servers running)
- ✅ Code compiled successfully
- ✅ E2E framework installing
- ⏳ Manual functional testing ready to begin
- ⏳ Pending: All checklist items completion

**Recommendation**: Start manual smoke test now in browser while reading this checklist.

---

**Report Owner**: QA Lead  
**Last Updated**: 2026-03-15 (Initial setup)  
**Next Update**: After manual testing complete
