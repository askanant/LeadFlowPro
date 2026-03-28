# Testing Issues & Observations

**Track all issues found during Week 4 testing here.**

---

## Format for Logging Issues

```
### Issue #[N]: [Brief Title]
**Severity**: Critical | High | Medium | Low  
**Component**: [LeadRecommendationsWidget | BulkScoringDashboard | LeadDetail]  
**Found**: [Date] by [Tester]  
**Status**: Open | In Progress | Fixed | Won't Fix

**Description**:
What's the issue? What's expected vs actual?

**Steps to Reproduce**:
1. Open dashboard
2. Scroll to widget
3. Click expand
4. Observe inconsistency

**Actual Result**:
What happens

**Expected Result**:
What should happen

**Fix**:
(Once resolved, document the fix here)

---
```

## Issues Log

### Issue #1: 
**Severity**: [Open – No issues logged yet]  
**Status**: N/A

---

## Testing Sessions

### Session 1 – Day 1 Smoke Test
**Date**: [TBD]  
**Tester**: [Name]  
**Result**: ⏳ Pending

Checklist:
- [ ] Dashboard loads
- [ ] Recommendations widget visible
- [ ] Can expand sections
- [ ] Can click leads
- [ ] Bulk scoring page loads
- [ ] Can select campaign & score
- [ ] Mobile responsive at 375px
- [ ] No console errors

---

### Session 2 – Lighthouse Audit
**Date**: [TBD]  
**Tester**: [Name]  
**Result**: ⏳ Pending

Scores:
- Performance: [TBD] / 100
- Accessibility: [TBD] / 100
- Best Practices: [TBD] / 100
- SEO: [TBD] / 100

Issues found:
- [ ] (none logged yet)

---

### Session 3 – Cross-Browser
**Date**: [TBD]  
**Tester**: [Name]  
**Result**: ⏳ Pending

Browsers tested:
- [ ] Chrome ___________
- [ ] Firefox __________
- [ ] Safari __________
- [ ] Edge _____________

Issues by browser:
- (none logged yet)

---

## Fix Tracking

| Issue # | Title | Severity | Status | Fixed By | Fix Date |
|---------|-------|----------|--------|----------|----------|
| — | (none logged yet) | — | — | — | — |

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| First Contentful Paint (FCP) | < 2s | [TBD] | ⏳ |
| Largest Contentful Paint (LCP) | < 3s | [TBD] | ⏳ |
| Cumulative Layout Shift (CLS) | < 0.1 | [TBD] | ⏳ |
| Time to Interactive (TTI) | < 4s | [TBD] | ⏳ |
| Bulk score 100 leads | < 10s | [TBD] | ⏳ |
| JS Bundle Size | < 1.25 MB | 1,010 KB | ✅ |

---

## Known Limitations

**Not fixing in Week 4** (defer to future sprints):

1. Dark mode support – not in scope
2. Advanced charting customization – looks good as-is
3. Real-time socket updates for live scoring – batch processing sufficient
4. Export bulk scoring results to CSV – can add in Week 5

---

## Sign-Off Checklist

Before declaring Week 4 complete:

- [ ] All Critical/High severity issues fixed
- [ ] Lighthouse score ≥ 90
- [ ] E2E tests ≥ 80% passing
- [ ] Mobile responsive verified (375px, 768px, 1024px)
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)
- [ ] No unhandled console errors
- [ ] Performance targets met
- [ ] WCAG AA accessibility verified

---

**Owner**: QA Lead  
**Last Updated**: [TBD]  
**Review Frequency**: Daily during Week 4
