# 📋 Dependency Management Quick Reference

**Your dependency monitoring system is now live.** Use this guide to navigate the new files and workflows.

---

## 📁 Files Created (What They Do)

### 1. `.npmrc` – NPM Configuration
**Purpose**: Enforces strict version pinning and security policies globally

**Key Settings**:
- `save-exact=false` - Uses semver ranges (controlled by package.json)
- `audit-level=moderate` - Fails on moderate+ security vulnerabilities
- `strict-peer-dependencies=true` - Ensures peer dependency resolution

**Action**: Already active; no changes needed

---

### 2. `docs/DEPENDENCY_STRATEGY.md` – The Master Plan 📖
**Purpose**: Central document defining HOW and WHEN to update each package

**Contains**:
- 4-tier classification (Tier 1: critical → Tier 4: flexible)
- Version pinning rules (~ vs ^ vs exact)
- Update frequency by tier
- Watchlist for high-risk packages (OpenAI, React Router, Prisma)
- Complete update process (monthly/quarterly/annual)

**When to Read**: Before updating ANY dependency
**Quick Link**: [DEPENDENCY_STRATEGY.md](docs/DEPENDENCY_STRATEGY.md)

---

### 3. `DEPENDENCY_UPDATES.md` – The Changelog 📝
**Purpose**: Track every dependency update and rationale

**Format**:
- Date-stamped entries
- Reason for update
- Test results
- Breaking changes documented
- Rollback procedures

**When to Update**: Every time you change a dependency
**Action Items**:
- [ ] Synchronize TypeScript (URGENT – different versions in workspaces)
- [ ] Pin OpenAI to ~6.27.0 (IMPORTANT – avoid API breaking changes)
- [ ] Review this document monthly

---

### 4. `scripts/check-dependencies.js` – Automated Auditor 🤖
**Purpose**: Scan for vulnerabilities, version mismatches, and pinning issues

**What It Checks**:
- Security vulnerabilities (npm audit)
- TypeScript version consistency across workspaces
- Version pinning compliance (Tier 1 should use ~)
- Outdated packages with tier-based warnings

**Run Command**:
```bash
npm run audit:dependencies
```

**Output Example**:
```
ℹ Tier 1 express@~4.18.3 correctly pinned
⚠ Tier 1 typescript uses ^ (caret) in apps/web; should use ~ (tilde)
✖ [HIGH] Security vulnerability in axios
```

**When to Run**:
- Monthly: 1st Friday automatic check
- Before merging any dependency update
- When troubleshooting version issues

---

### 5. `scripts/sync-typescript-versions.sh` – TypeScript Synchronizer 
**Purpose**: Fix the current TypeScript version mismatch

**Current State**:
- apps/api: TypeScript 5.3.3
- apps/web: TypeScript ~5.9.3
- **Problem**: Different versions = inconsistent type checking

**Run Command**:
```bash
npm run sync:typescript
```

**What It Does**:
1. Updates apps/api to TypeScript ~5.9.3
2. Updates apps/web to TypeScript ~5.9.3
3. Updates root package.json
4. Verifies all match in output

**Action**: ⚡ **RUN THIS SOON** (recommended before next deployment)

---

### 6. `scripts/openai-sdk-upgrade-checklist.md` – Critical Safety Checklist ✅
**Purpose**: Structured process for safely upgrading OpenAI SDK

**Because**: OpenAI changes API surface frequently; need careful testing

**Contains**:
- Pre-upgrade checklist (identify all integrations)
- Testing phase (unit, integration, functional, performance)
- Rollback plan (if something breaks)
- Known errors & fixes
- Version history tracking table

**When to Use**: 
- Before upgrading openai package from 6.27.0
- If OpenAI features break unexpectedly
- Reference for future major version upgrades

---

## 🚀 New Commands You Can Run

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `npm run audit:dependencies` | Scan for vulnerabilities & version issues | Monthly |
| `npm run sync:typescript` | Fix TypeScript version mismatches | Once (soon) |

---

## 📅 Update Schedules

### Monthly (1st Friday)
```bash
npm run audit:dependencies
```
✅ Review Tier 4 (utility) packages  
✅ Check security vulnerabilities  
✅ Update DEPENDENCY_UPDATES.md  

### Quarterly (Mar/Jun/Sep/Dec)
✅ Review Tier 2 & 3 minor version updates  
✅ Test update in staging (48 hours)  
✅ Decide: merge or skip  

### Annual (January)
✅ Tier 1 major version discussion (React? Express? Prisma?)  
✅ Create 12-month upgrade roadmap  
✅ Update DEPENDENCY_STRATEGY.md targets  

### Emergency (Security Issue)
✅ Immediate patch to all tiers  
✅ Run full E2E tests  
✅ Document in DEPENDENCY_UPDATES.md  

---

## 🎯 Immediate Actions (Next 48 Hours)

1. **Sync TypeScript** (5 minutes)
   ```bash
   npm run sync:typescript
   ```

2. **Pin OpenAI SDK** (2 minutes)
   - Edit: `apps/api/package.json`
   - Find: `"openai": "^6.27.0"`
   - Change to: `"openai": "~6.27.0"`
   - Run: `npm install`

3. **Run Initial Audit** (1 minute)
   ```bash
   npm run audit:dependencies
   ```

4. **Document Status** (1 minute)
   - Add entry to [DEPENDENCY_UPDATES.md](DEPENDENCY_UPDATES.md)
   - Date: 2026-03-15
   - Note: "Initial dependency stabilization"

---

## ⚠️ Watchlist: High-Risk Packages

### 🔴 OpenAI SDK (6.27.0)
**Risk**: API surface changes frequently
**Action**: Use ~6.27.0 pinning; follow checklist before any upgrade
**Test**: All AI features (scoring, enrichment, competitor detection)

### 🟡 React Router (7.13.1)
**Risk**: Navigation logic — breaking changes hurt UX
**Action**: Test all major routes after any upgrade
**Monitor**: React compatibility announcements

### 🟡 Prisma (7.4.2)
**Risk**: Database layer — silent failures possible
**Action**: Run full migration suite before upgrading
**Monitor**: Prisma GitHub for breaking change notices

---

## 🔗 Related Documentation

- **Strategy Deep Dive**: [docs/DEPENDENCY_STRATEGY.md](docs/DEPENDENCY_STRATEGY.md)
- **Update Changelog**: [DEPENDENCY_UPDATES.md](DEPENDENCY_UPDATES.md)
- **OpenAI Safety**: [scripts/openai-sdk-upgrade-checklist.md](scripts/openai-sdk-upgrade-checklist.md)
- **npm Semver Reference**: https://semver.npmjs.com/
- **Node LTS Schedule**: https://nodejs.org/en/about/releases/

---

## 💡 Tips & Tricks

### Check what's outdated (without running audit):
```bash
npm outdated
```

### See why a package is installed:
```bash
npm explain openai
```

### Test a package version before committing:
```bash
npm install openai@6.28.0 --workspace=apps/api
npm test
npm install openai@6.27.0 --workspace=apps/api
```

### Find all references to a package:
```bash
grep -r "openai" apps/api/src --include="*.ts" | grep -v node_modules
```

---

**Questions?** Reference [DEPENDENCY_STRATEGY.md](docs/DEPENDENCY_STRATEGY.md) or check your audit output.

**Last Updated**: 2026-03-15  
**Owner**: Tech Lead  
**Review Cycle**: Quarterly (or as needed)
