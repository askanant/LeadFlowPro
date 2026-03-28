# ✅ Week 4 Testing Plan - EXECUTION STARTED

**Date**: March 15, 2026 | **Status**: Day 1 - Smoke Testing Active

---

## 🎯 What's Running Right Now

| Component | Status | Details |
|-----------|--------|---------|
| **API Server** | 🟢 Running | Port 3000 |
| **Web Server** | 🟢 Running | Port 5176 |
| **Database** | 🟢 Connected | Neon PostgreSQL |
| **Playwright** | ⏳ Installing | Browsers downloading |

**Test URLs Ready**:
- 🎯 **Dashboard**: http://localhost:5176/dashboard
- 🎯 **Bulk Scoring**: http://localhost:5176/bulk-scoring
- 🎯 **Lead Detail**: http://localhost:5176/leads/[any-id]

---

## 📋 What You Have to Test

### 3 Main Features
1. **LeadRecommendationsWidget** ← Must verify on dashboard
2. **BulkScoringDashboard** ← New page, must test campaign scoring
3. **LeadDetail Enrichment Tab** ← Must verify data displays correctly

### 3 New Documents Created
- [HANDS_ON_TEST_DAY1.md](HANDS_ON_TEST_DAY1.md) ← START HERE (step-by-step guide)
- [SMOKE_TEST_REPORT_DAY1.md](SMOKE_TEST_REPORT_DAY1.md) ← Checklist to complete
- [TESTING_ISSUES.md](TESTING_ISSUES.md) ← Log bugs as found

---

## 🚀 DO THIS NOW (30 minutes)

### Step 1: Manual Testing
**Follow**: [HANDS_ON_TEST_DAY1.md](HANDS_ON_TEST_DAY1.md)

```
✅ Open http://localhost:5176/dashboard
✅ Test Recommendations widget (expand sections, click leads)
✅ Go to http://localhost:5176/bulk-scoring
✅ Select campaign, score leads
✅ Click a lead, check Enrichment tab
✅ Test on mobile (DevTools, 375px width)
Time: ~30 minutes
```

### Step 2: Log Issues
**Where**: [TESTING_ISSUES.md](TESTING_ISSUES.md)

```
Found a problem? Log it:
- What's wrong?
- Expected vs actual?
- Severity? (Critical/High/Medium/Low)
```

### Step 3: Update Report
**File**: [SMOKE_TEST_REPORT_DAY1.md](SMOKE_TEST_REPORT_DAY1.md)

```
After testing, update:
- Check ✅ all manual tests passing
- Note any issues found
- Screenshot Lighthouse scores
```

---

## 📅 Week 4 Timeline

### ✅ Day 1 (Today: Mar 15)
- Infrastructure setup ✅ DONE
- Manual smoke test ← **YOU ARE HERE**
- Baseline Lighthouse audit
- E2E framework installed ✅ (Playwright installing)

### 🟡 Day 2 (Mar 16)
- UI polish (animations, spacing)
- Fix any issues from Day 1
- Hover/active states

### 🟡 Day 3 (Mar 17)
- Performance optimization
- Run full Lighthouse suite
- Load testing (100+ leads)

### 🟡 Day 4 (Mar 18)
- Cross-browser testing (Chrome/Firefox/Safari/Edge)
- Final sign-off
- Ready for Week 5 (documentation)

---

## 📊 Success Criteria

### By End of Day 1: Smoke Test Pass ✅
- [ ] All 3 features work end-to-end
- [ ] 0 critical bugs
- [ ] Pages load without 404/500 errors
- [ ] Mobile responsive at 375px

### By End of Day 2: UI Polish ✅
- [ ] Visual consistency (spacing, typography, colors)
- [ ] Smooth animations (200ms expand/collapse)
- [ ] Hover effects on interactive elements

### By End of Day 3: Performance ✅
- [ ] Lighthouse ≥ 90 (all categories)
- [ ] FCP < 2s, LCP < 3s
- [ ] Bulk score 100 leads < 10s

### By End of Day 4: Production Ready ✅
- [ ] Cross-browser tested
- [ ] Accessibility verified
- [ ] E2E tests ≥ 80% passing
- [ ] Sign-off approved

---

## 🎯 Your Tasks Right Now

### README for Different Roles

#### 👨‍💻 Frontend Engineer:
1. Read: [HANDS_ON_TEST_DAY1.md](HANDS_ON_TEST_DAY1.md)
2. Open: http://localhost:5176/dashboard
3. Execute manual testing checklist
4. If issues found: Fix today, re-test
5. Tomorrow: UI polish (animations, hover states)

#### 🧪 QA Lead:
1. Read: [TESTING_PLAN_WEEK4.md](TESTING_PLAN_WEEK4.md) (comprehensive plan)
2. Read: [TESTING_PROCEDURES.md](TESTING_PROCEDURES.md) (how to run tests)
3. Start: [HANDS_ON_TEST_DAY1.md](HANDS_ON_TEST_DAY1.md) (step-by-step)
4. Document: Any issues in [TESTING_ISSUES.md](TESTING_ISSUES.md)
5. Tomorrow: Performance testing + Lighthouse

#### 🏗️ Architect/Tech Lead:
1. Review the 3 new features via dashboard
2. Check: Code quality via [TESTING_PROCEDURES.md](TESTING_PROCEDURES.md) "E2E Tests" section
3. Schedule: Cross-browser testing (Day 4)
4. Plan: Deployment (after Week 4 sign-off)

---

## 📈 Progress Tracking

**Setup Phase**: ✅ COMPLETE
- Created comprehensive testing plan
- Set up dependency management
- Created calendar reminders
- Both servers running

**Testing Phase**: ⏳ IN PROGRESS
- Day 1 Smoke Test: Now (manual testing)
- Day 2 UI Polish: Tomorrow
- Day 3 Performance: Day after
- Day 4 Final: Friday

**Documentation Phase**: Waiting for Week 5

---

## 🆘 If You Get Stuck

### Can't find the widget?
→ Dashboard is at http://localhost:5176/dashboard  
→ Scroll DOWN to see Recommendations widget (it's below the main stats)

### Page won't load?
→ Check terminal: Are both `npm run dev` processes still running?  
→ API on port 3000: `npm run dev --workspace=apps/api`  
→ Web on port 5176: `npm run dev --workspace=apps/web`

### Getting 404?
→ Refresh page (Ctrl+R)  
→ Check URL matches exactly: http://localhost:5176/...

### Console errors?
→ F12 → Console tab  
→ Screenshot the error  
→ Log to [TESTING_ISSUES.md](TESTING_ISSUES.md)

---

## 📚 Reference Docs

| Document | Purpose | When to Use |
|----------|---------|------------|
| [WEEK4_QUICKSTART.md](WEEK4_QUICKSTART.md) | Overview | Planning week |
| [TESTING_PLAN_WEEK4.md](TESTING_PLAN_WEEK4.md) | Detailed test plan | Week 4 reference |
| [TESTING_PROCEDURES.md](TESTING_PROCEDURES.md) | How to run tests | During testing |
| [HANDS_ON_TEST_DAY1.md](HANDS_ON_TEST_DAY1.md) | Step-by-step manual | RIGHT NOW ← START HERE |
| [SMOKE_TEST_REPORT_DAY1.md](SMOKE_TEST_REPORT_DAY1.md) | Results documentation | After testing |
| [TESTING_ISSUES.md](TESTING_ISSUES.md) | Bug tracking | As issues found |

---

## ✨ Next Action

> **👉 Open [HANDS_ON_TEST_DAY1.md](HANDS_ON_TEST_DAY1.md) and start testing!**

---

**Status**: Ready to test  
**Owner**: QA / Frontend Team  
**ETA**: Week 4 complete = March 21, 2026  
**Handoff**: To Week 5 (documentation) on March 22
