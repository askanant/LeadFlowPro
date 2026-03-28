# Dependency Management Strategy

**Document Status**: Active | **Last Updated**: 2026-03-15 | **Owner**: Tech Lead

## Overview
This document outlines LeadFlowPro's approach to managing dependencies for long-term stability and maintainability.

## Dependency Classification

Dependencies are classified by **stability tier** and **update frequency**:

### Tier 1: Core Platform (Minimal Updates, 12-month cycles)
These should NOT change frequently. Version bumps require team discussion.

| Package | Current | Stability | Update Policy |
|---------|---------|-----------|----------------|
| `typescript` | 5.9.3 | Very High | Minor version bumps only (5.x → 5.y) after release + 1 month testing |
| `node` (runtime) | 20.x LTS | Very High | LTS version only; upgrade on 6-month cycle |
| `express` | 4.18.3 | Very High | 4.x only; monitor for 5.0 preannouncements 18+ months in advance |
| `react` | 19.2.0 | Very High | 19.x stable; plan for 20.x in 2027 |
| `@prisma/client` | 7.4.2 | Very High | Major version only on release + 2 months; test migrations thoroughly |

### Tier 2: Important Libraries (Quarterly Review, 6-month cycles)
Update as new major versions stabilize; stick to current major version.

| Package | Current | Update Policy |
|---------|---------|----------------|
| `vite` | 7.3.1 | Quarterly minor bumps; major versions after 2-month stabilization |
| `react-router-dom` | 7.13.1 | Follow React release cycle; test navigation thoroughly |
| `@tanstack/react-query` | 5.90.21 | Minor bumps acceptable; major versions after 1 month in market |
| `tailwindcss` | 4.2.1 | Minor bumps acceptable; CSS changes non-breaking usually |

### Tier 3: Volatile/Rapidly Evolving (Monthly Review, 3-month cycles)
High update velocity; pin to minor versions to prevent breaking changes in patch releases.

| Package | Current | Update Policy | Critical |
|---------|---------|----------------|----------|
| `openai` | 6.27.0 | **PIN to 6.27.x** (not ^); test all AI endpoints on upgrade | YES |
| `stripe` | 20.4.1 | Minor bumps acceptable; major versions on release + 1 week |  |
| `@aws-sdk/client-s3` | ^3.1003.0 | Test S3 operations on any update; document breaking changes | Monitor |
| `axios` | 1.13.6 | Minor bumps acceptable; plan Fetch API migration in 2028 |  |

### Tier 4: Utilities (Flexible, as needed)
Low risk; can receive updates more frequently.

| Package | Current | Update Policy |
|---------|---------|----------------|
| `bcryptjs`, `jsonwebtoken` | Stable | Minor bump on security updates only |
| `zod`, `clsx`, `lucide-react` | Stable | Monthly patch updates acceptable |
| `zustand`, `morgan`, `cors` | Stable | Quarterly review; no urgency |

---

## Version Pinning Policy

### Critical (Tier 1 & 3 OpenAI)
**Use `~` (tilde) to allow patch updates only:**
```json
"typescript": "~5.9.3",
"openai": "~6.27.0",
"express": "~4.18.3"
```

### Important (Tier 2)
**Use `^` (caret) to allow minor updates:**
```json
"vite": "^7.3.1",
"react-router-dom": "^7.13.1",
"@tanstack/react-query": "^5.90.21"
```

### Utilities (Tier 4)
**Standard semver; review monthly:**
```json
"clsx": "^2.1.1",
"lucide-react": "^0.577.0"
```

---

## Update Process

### Monthly (1st Friday)
1. Run `npm outdated` across all workspaces
2. Review Tier 4 updates (utilities) — apply patch updates automatically via CI/CD
3. Document in DEPENDENCY_UPDATES.md

### Quarterly (Every 3 months: March, June, September, December)
1. Run security audit: `npm audit --production`
2. Review Tier 2 & 3 minor version updates
3. Test upgrade in staging environment (48 hours)
4. Merge if no regressions found

### Annually (January)
1. **Tier 1 Review**: Discuss major version strategies (React 19→20?, Express 4→5?)
2. Plan 12-month upgrade roadmap
3. Update DEPENDENCY_STRATEGY.md with new year targets

### Emergency (Security/Critical Bug)
1. All tiers: Immediate patch to fix vulnerability
2. Run full E2E tests before production deploy
3. Document incident in DEPENDENCY_UPDATES.md

---

## Watchlist: High-Risk Dependencies

### ⚠️ OpenAI SDK (6.27.0)
**Why monitored:** OpenAI changes API surface frequently; breaking changes in minor versions possible.

**Monitoring:**
- Check [openai/openai-node GitHub releases](https://github.com/openai/openai-node) weekly
- Before minor bump: Run all AI feature tests (lead scoring, enrichment, recommendations)
- **Action**: Maintain strict pin to 6.27.x until team approves upgrade

**Next Major Version Plan**: When 7.x released, allocate 1 week for testing before adoption

### ⚠️ React Router (7.13.1)
**Why monitored:** Router logic affects all navigation; breaking changes impact UX.

**Monitoring:**
- After React minor updates, check router compatibility announcements
- Test core routes: login → dashboard → leads → campaigns

**Next Major Version Plan**: React Router 8.x (if released); evaluate Server Function support

### ⚠️ Prisma (7.4.2)
**Why monitored:** Database layer; migrations can fail silently.

**Monitoring:**
- Before major version: Run full Prisma test suite
- Test all schema operations: create, update, delete, transactions
- Ensure migration backward compatibility

**Next Major Version Plan**: Prisma 8.x; allocate 2 weeks for comprehensive testing

---

## Dealing with Breaking Changes

### If a breaking change is discovered:

1. **Identify Scope**
   - Which features/modules affected?
   - Is production impacted?

2. **Quarantine**
   - Revert to prior version immediately
   - Create GitHub issue with label `dependency:breaking-change`

3. **Assessment**
   - Time to fix estimate
   - Workarounds available?

4. **Communication**
   - Notify team if merged to main
   - Update DEPENDENCY_UPDATES.md

5. **Resolution**
   - Either upgrade + refactor, or stay on current version + document why

---

## Dependency Audit Script

Run monthly (see `scripts/check-dependencies.js`):

```bash
npm run audit:dependencies
```

Output includes:
- Security vulnerabilities (moderate/high/critical)
- Outdated packages by tier
- Recommendations for updates

---

## References

- [npm semver calculator](https://semver.npmjs.com/)
- [Node.js LTS schedule](https://nodejs.org/en/about/releases/)
- [TypeScript Release Cycle](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)
- [React Roadmap](https://react.dev/community/roadmap)
- [Prisma Releases](https://github.com/prisma/prisma/releases)
