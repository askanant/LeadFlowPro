# OpenAI SDK Upgrade Checklist

**Critical**: OpenAI SDK updates frequently; this checklist ensures safe upgrades.

Before upgrading from current version (`6.27.0`) to any new version, complete this checklist.

---

## Pre-Upgrade Phase

- [ ] **Read OpenAI SDK Release Notes**
  - Changelog: https://github.com/openai/openai-node/releases
  - Migration guide (if available)
  - List of breaking changes

- [ ] **Identify All OpenAI Integration Points**
  ```bash
  grep -r "openai\|OpenAI" apps/api/src --include="*.ts" | grep -v node_modules
  ```
  Expected locations:
  - `apps/api/src/modules/ai/ai.service.ts` (primary)
  - Any other references?

- [ ] **Document Current API Usage**
  - Chat Completions: Which models? (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
  - Embedding models used?
  - Any vision/image capabilities?
  - Temperature/top_p settings?

---

## Testing Phase

### Unit Tests
- [ ] Run AI service unit tests
  ```bash
  npm test -- ai.service.test.ts
  ```

### Integration Tests
- [ ] Test lead scoring with new SDK version
- [ ] Test lead enrichment API calls
- [ ] Test competitor detection
- [ ] Test bulk scoring endpoint

### Functional Tests (Manual in Staging)
- [ ] Create a new lead → verify AI scoring works
- [ ] Check bulk score campaign → verify batch processing
- [ ] Check enrichment data population
- [ ] Verify competitor risk detection flags correctly

### Performance Tests
- [ ] Measure scoring latency (before/after)
- [ ] Measure token usage (if exposed by SDK)
- [ ] Load test: score 100 leads in bulk

---

## Rollback Plan

If tests fail or new version breaks features:

```bash
# Revert to known-good version
npm install openai@6.27.0 --workspace=apps/api

# Clear cache
rm -rf node_modules package-lock.json
npm install

# Confirm revert
npm ls openai
```

---

## Upgrade Decision Matrix

| Scenario | Action |
|----------|--------|
| Patch update (6.27.0 → 6.27.1) | Fast-track: 1 day testing, low risk |
| Minor update (6.27 → 6.28) | Standard: 3 days testing, watch for subtle changes |
| Major update (6.x → 7.x) | Extended: 1 week testing, plan refactoring |
| OpenAI API version (v1 → v2) | Critical: 2 weeks testing, potential major refactor |

---

## Version History

| Date | From | To | Status | Notes |
|------|------|-----|--------|-------|
| 2026-03-15 | (baseline) | 6.27.0 | Current | Pinned to ~6.27.0 per strategy |
| | | | | |

---

## Quick Reference: Common Errors & Fixes

### Error: `"Cannot find name 'OpenAI'"`
**Fix**: Check import statement
```typescript
import OpenAI from 'openai'; // Correct (default export as of 6.x)
```

### Error: `"message" is not iterable`
**Fix**: SDK changed response format in minor version
```typescript
// Old (5.x):
for (const msg of response.choices[0].message) { }

// New (6.x):
const msg = response.choices[0].message;
```

### Error: `"token count mismatch"`
**Fix**: SDK may have changed token counting logic
- Clear caches
- Verify model compatibility
- Check if token encoding changed

---

**Responsible**: Tech Lead | **Review Cycle**: With each proposed OpenAI upgrade
