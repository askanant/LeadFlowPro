# Week 4 Testing & Polish - Quick Start

**Goals**: Polish UI, expand test coverage, validate performance

---

## 🚀 Start Here (Today)

### Manual Smoke Test (5 minutes)
```bash
# Terminal 1
npm run dev --workspace=apps/api

# Terminal 2
npm run dev --workspace=apps/web

# Then open:
# Dashboard: http://localhost:5174/dashboard
# Bulk Scoring: http://localhost:5174/bulk-scoring
```

✅ Checklist:
- [ ] Dashboard loads without errors (check DevTools console)
- [ ] Recommendations widget visible below main stats
- [ ] Can click to expand sections
- [ ] Can click a lead → navigates to LeadDetail
- [ ] Bulk Scoring page loads
- [ ] Can select campaign and click "Start Bulk Scoring"
- [ ] Scoring completes without crashing

### Test on Phone (10 minutes)
```
1. Get your laptop IP: ipconfig (look for IPv4)
2. On phone: http://YOUR_IP:5174/dashboard
3. Verify:
   - No horizontal scrolling
   - Text readable
   - Buttons tappable
   - Sections stack vertically
```

---

## 📋 Day-by-Day Plan

### Day 1: Functional Testing
**Owner**: QA / Full-stack engineer  
**Effort**: 4 hours

```bash
# Run automated tests
npx playwright test

# Manual testing checklist (see TESTING_PROCEDURES.md)
# - Desktop functional
# - Mobile responsive
# - Error states
# - Loading states
```

**Sign-off**: All 3 features work end-to-end

### Day 2: UI Polish
**Owner**: Frontend engineer  
**Effort**: 4-6 hours

Focus areas:
- [ ] Spacing/alignment consistency (use 6px base unit)
- [ ] Typography hierarchy (title > header > body)
- [ ] Color consistency (red=hot, orange=warm, etc.)
- [ ] Hover/click feedback animations
- [ ] Error message clarity

**Files to review**:
- [x] LeadRecommendationsWidget.tsx – OK, just needs animation polish
- [x] BulkScoringDashboard.tsx – OK, styling looks good
- [ ] LeadDetail enrichment tab – Add: job level icons, better formatting

### Day 3: Performance Testing
**Owner**: Full-stack engineer  
**Effort**: 3 hours

```bash
# Lighthouse audit
# DevTools → Lighthouse tab
# Target: ≥90 Performance score

# Load test
# DevTools → Network → Slow 4G
# Reload dashboard
# Target: < 4 seconds interactive
```

**Performance targets**:
- FCP < 2s ✓
- LCP < 3s ✓
- CLS < 0.1 ✓
- Bulk score 100 leads < 10s ✓

### Day 4: Cross-browser & Final
**Owner**: QA  
**Effort**: 2-3 hours

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Verification**: No console errors, all features work

---

## 🧪 Testing Commands Reference

### Quick Smoke Test
```bash
npm run dev --workspace=apps/api &
npm run dev --workspace=apps/web &
# Open http://localhost:5174/dashboard
```

### Full E2E Tests
```bash
npx playwright test
npx playwright show-report  # View results
```

### Specific Test File
```bash
npx playwright test e2e/recommendations.spec.ts --headed
```

### Lighthouse (Manual)
```
1. DevTools (F12)
2. Lighthouse tab
3. Analyze page load
4. Target: ≥90 Performance
```

### Accessibility Scan (Manual)
```
1. DevTools (F12)
2. Lighthouse tab → Accessibility
3. Fix any high-impact issues
```

---

## 🎯 UI Polish Priorities

### Must-Do (High Impact)
1. [ ] **Animation smoothness**
   - Expand/collapse sections: 200ms easeOut
   - Button press feedback: 50/100ms
   - Current: Tailwind `transition-all` OK, but could be more snappy

2. [ ] **Hover effects**
   - Lead items should lighten on hover
   - Buttons should show :active state
   - Cards might get subtle shadow

3. [ ] **Error messages**
   - Current: Generic "Failed to score leads"
   - Better: "Failed to score 3 leads in campaign. Check leads and retry."

### Nice-to-Have (Medium Impact)
4. [ ] **Loading skeletons** – Replace spinners with skeleton cards (more polished feel)
5. [ ] **Gradient backgrounds** – Score distribution cards could use subtle gradients
6. [ ] **Icons** – Add smaller icon badges (checkmark for verified, X for invalid)

### Can-Skip (Low Impact)
7. [ ] Custom animations library (Framer Motion) – overkill for this
8. [ ] Dark mode support – not in scope
9. [ ] Advanced charting (custom recharts themes) – looks good as-is

---

## 📊 Success Criteria

### Testing
- [ ] ≥95% features work end-to-end
- [ ] 0 critical bugs
- [ ] All E2E tests passing
- [ ] ≥90 Lighthouse score (desktop)
- [ ] ≥85 Lighthouse score (mobile)

### UI Polish
- [ ] No visual inconsistencies
- [ ] Smooth animations (60fps)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Cross-browser compatible
- [ ] Accessible (WCAG AA)

### Performance
- [ ] < 2s FCP
- [ ] < 3s LCP
- [ ] Bulk score 100 leads < 10s
- [ ] Bundle size < 1.25 MB

---

## 🚢 Ready for Production?

Before moving to Week 5 (documentation), confirm:

✅ **Functionality**
- All 3 features fully working (recommendations, bulk scoring, enrichment)
- No crashes or unhandled errors
- Data accurate and consistent

✅ **Testing**
- E2E test suite ≥80% passing
- Manual smoke test passing
- Load test passing

✅ **Performance**
- Lighthouse ≥90
- No memory leaks
- Acceptable latency

✅ **UI/UX**
- Polished and consistent
- Mobile responsive
- Accessible to all users

✅ **Documentation**
- TESTING_PROCEDURES.md complete
- TESTING_PLAN_WEEK4.md complete
- Known issues documented

---

## Next Steps

1. **Start Day 1**: Run smoke test + E2E tests
2. **Identify failures**: Log issues in [TESTING_ISSUES.md](TESTING_ISSUES.md)
3. **Day 2**: Fix failures + polish UI
4. **Day 3-4**: Performance + cross-browser
5. **Friday**: Sign-off & ready for Week 5

See [TESTING_PROCEDURES.md](TESTING_PROCEDURES.md) for detailed how-tos.

---

**Status**: Handoff ready  
**Estimated effort**: 14-18 hours over 4 days  
**Team**: Can be done by 1-2 engineers in parallel
