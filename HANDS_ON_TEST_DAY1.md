# 🚀 Week 4 Day 1 - Hands-On Testing Script

**You have both servers running. Test the 3 features right now.**

---

## Step 1: Open Dashboard (5 min)

**URL**: http://localhost:5176/dashboard

**Expected**: Dashboard with stats, leads table, and **Recommendations Widget** below

✅ **Checklist**:
- [ ] Page loads (no 404)
- [ ] No red errors in DevTools console (F12)
- [ ] Stats cards visible (revenue, leads, etc.)
- [ ] Leads table visible
- [ ] 📍 **Scroll down** → See "Recommendations Widget" section

---

## Step 2: Test Recommendations Widget (5 min)

**Location**: Below main dashboard stats

**You should see 4 sections**:
```
🔥 Hot Leads Needing Action (≥80 score)
⏰ Leads Expiring Soon (<48h old, ≥70 score)
⚠️ High-Risk Leads (generic email domains)
✨ New High-Scoring (last 24h, ≥75 score)
```

✅ **Checklist**:
- [ ] All 4 sections visible
- [ ] Each section has an expand/collapse arrow
- [ ] Click arrow on "Hot Leads" → List expands (≥200ms smooth animation)
- [ ] See 5 leads or fewer (if not enough leads, see message)
- [ ] Each lead shows: Name, Email, Score badge
- [ ] Click a lead name → Goes to /leads/[ID]
- [ ] Expand "High-Risk Leads" → See leads with generic emails (gmail, yahoo, outlook, hotmail)
- [ ] No flashing/flickering

✅ **Animation Quality Check**:
- Expand/collapse should take ~200ms (not instant, not slow)
- No jank (frame drops) visible

---

## Step 3: Navigate to Bulk Scoring (5 min)

**Option A**: From Dashboard, look for "Bulk Score Leads" button → Click it

**Option B**: Directly visit http://localhost:5176/bulk-scoring

**Expected**: New page with left panel (campaign selector) and right panel (analytics)

✅ **Checklist**:
- [ ] Page loads (no 404)
- [ ] Heading says "Bulk Lead Scoring"
- [ ] Left panel shows "Select Campaign" dropdown
- [ ] Right panel shows score distribution cards

---

## Step 4: Test Bulk Scoring (5 min)

**Location**: Left panel of /bulk-scoring

1. **Select a campaign**:
   - [ ] Click dropdown "— Choose a campaign —"
   - [ ] See list of campaigns
   - [ ] Select one (e.g., "Q1 2026 Leads")

2. **Click "Start Bulk Scoring"**:
   - [ ] Button should be ENABLED now
   - [ ] Click it
   - [ ] Button shows "Scoring..." text
   - [ ] ⏱️ Wait 5-15 seconds (depending on lead count)

3. **Check Results**:
   - [ ] Green success message appears
   - [ ] Shows: "Total Leads: XXX", "Successfully Scored: XXX", "Errors: X"
   - [ ] No crash or timeout

✅ **Results Validation**:
- [ ] Right panel updates with distribution
- [ ] Hot/Warm/Cold/Junk cards show counts
- [ ] Percentages shown (add up to ~100%)
- [ ] Progress bars render
- [ ] "Average Scores by Dimension" section shows 6 bars:
  - Overall, Quality, Engagement, Intent, Firmographic, Risk
- [ ] Each score 0-100
- [ ] "Conversion by Tier" shows %: Hot > Warm > Cold > Junk
- [ ] "Top Scoring Factors" chart visible

---

## Step 5: Test Lead Detail & Enrichment (5 min)

**From Dashboard** (http://localhost:5176/dashboard):

1. **Click any lead**:
   - [ ] Goes to /leads/[ID]
   - [ ] Lead details page loads

2. **Find Enrichment Tab**:
   - [ ] Look for tabs: "Overview", "Enrichment", "Notes", "Interactions"
   - [ ] Click "Enrichment"

3. **Check Enrichment Data**:
   - [ ] Email Quality: Shows "Business Domain / Verified" OR "Personal / Unverified"
   - [ ] Phone Valid: Shows "Yes" or "No"
   - [ ] Job Level: Shows level (C-level, Director, Manager, IC, Unknown)
   - [ ] Company Size: Shows S/M/L/Enterprise
   - [ ] LinkedIn URL: Clickable link (if present)

4. **Check Competitor Badge** (if applicable):
   - [ ] Some leads shown as "Competitor Risk" in red badge
   - [ ] Tooltip or expand shows reason
   - [ ] Examples: Salesforce employees, HubSpot, Stripe, etc.

---

## 📱 Mobile Check (5 min)

**In DevTools (F12)**:
1. Click mobile icon (device toggle)  
2. Set to iPhone 12 (375 x 812)
3. Refresh dashboard

✅ **Checklist**:
- [ ] No horizontal scrolling
- [ ] Text readable (not too small)
- [ ] Buttons tappable (large enough)
- [ ] Recommendations widget stacks vertically
- [ ] Campaign dropdown full width
- [ ] Score cards stack in single column

---

## 📊 Performance Test (5 min)

**In DevTools**:
1. Go to Lighthouse tab
2. Analyze page load (Performance + Accessibility)

✅ **Targets**:
- Performance: ≥ 90 ✓ (should be close)
- Accessibility: ≥ 90 ✓ (should be close)

---

## ✅ Final Checklist

Got through everything above? Go through this:

- [ ] Dashboard works end-to-end
- [ ] Recommendations widget functional
- [ ] Bulk scoring works (campaign → score → results)
- [ ] Lead detail + enrichment works
- [ ] Mobile responsive looks good
- [ ] No major console errors
- [ ] Performance decent (page loads < 3s)

---

## 🐛 Found an Issue?

1. **Note the problem**: What happened? What should happen?
2. **Screenshot it**: (Optional but helpful)
3. **Log it** in [TESTING_ISSUES.md](../TESTING_ISSUES.md)
4. **Severity**: Critical (breaks feature) | High | Medium | Low

**Example**:
```
### Issue #1: Hot Leads list doesn't show scores
**Component**: LeadRecommendationsWidget  
**Severity**: High
**Steps**: Dashboard → Expand "Hot Leads" → No scores visible
**Expected**: Each lead should show score (e.g., "92/100")
```

---

## ⏰ Time Estimate

- Dashboard test: 5 min
- Recommendations widget: 5 min
- Bulk scoring: 5 min
- Lead detail: 5 min
- Mobile test: 5 min
- Performance test: 5 min

**Total: ~30 minutes**

---

## Next: Day 2

Once all above ✅, proceed to:
- UI polish (animations, spacing, colors)
- See [TESTING_PLAN_WEEK4.md](TESTING_PLAN_WEEK4.md) Phase 2

---

## 🆘 Stuck?

1. **Page not loading?** 
   - Check: Is `npm run dev --workspace=apps/web` still running?
   - Try: Refresh page (Ctrl+R)
   - Check: Web is on port 5176 (see previous terminal output)

2. **Can't find feature?**
   - Recommendations widget is BELOW the main card stats on dashboard
   - Scroll down!

3. **Getting 404?**
   - Make sure servers are running (both npm dev processes)
   - Check terminal for errors

4. **Red errors in console?**
   - Screenshot
   - Note which page
   - Add to [TESTING_ISSUES.md](../TESTING_ISSUES.md)

---

**STATUS**: Ready to test now!  
**SERVERS**: Running on localhost:3000 (API) and localhost:5176 (Web)  
**NEXT**: Complete this script, log findings, move to Day 2
