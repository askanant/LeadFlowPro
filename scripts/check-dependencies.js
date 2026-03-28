#!/usr/bin/env node

/**
 * Dependency Audit & Monitoring Script
 * 
 * Usage: npm run audit:dependencies
 * 
 * Checks for:
 * - Security vulnerabilities
 * - Outdated packages by tier
 * - Version mismatch across workspaces
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✖${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

// Tier 1: Critical dependencies (use ~ for patch-only)
const TIER_1 = [
  'typescript',
  'express',
  'react',
  '@prisma/client',
  'node',
];

// Tier 3: Volatile (monitor closely)
const TIER_3 = [
  'openai',
  'stripe',
  '@aws-sdk/client-s3',
];

// Workspaces to check
const WORKSPACES = ['apps/api', 'apps/web'];

function readPackageJson(workspace) {
  try {
    const filePath = path.join(process.cwd(), workspace, 'package.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function checkSecurityVulnerabilities() {
  log.section('🔒 Security Audit');
  
  try {
    const output = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditData = JSON.parse(output);

    if (auditData.metadata.vulnerabilities.total === 0) {
      log.success('No security vulnerabilities found');
      return;
    }

    const { critical, high, moderate, low } = auditData.metadata.vulnerabilities;
    
    if (critical > 0) {
      log.error(`${critical} CRITICAL vulnerabilities`);
    }
    if (high > 0) {
      log.warn(`${high} HIGH vulnerabilities`);
    }
    if (moderate > 0) {
      log.warn(`${moderate} MODERATE vulnerabilities`);
    }
    if (low > 0) {
      log.info(`${low} LOW vulnerabilities`);
    }

    log.info('Run `npm audit` for detailed report');
  } catch (err) {
    log.warn('Could not run npm audit');
  }
}

function checkWorkspaceVersionSync() {
  log.section('📦 Workspace Version Consistency');

  const versionMap = {};

  WORKSPACES.forEach((workspace) => {
    const pkg = readPackageJson(workspace);
    if (!pkg) return;

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    Object.entries(allDeps).forEach(([name, version]) => {
      if (!versionMap[name]) {
        versionMap[name] = {};
      }
      versionMap[name][workspace] = version;
    });
  });

  let hasMismatch = false;

  Object.entries(versionMap).forEach(([pkg, versions]) => {
    const uniqueVersions = Object.values(versions);
    const versionSet = new Set(uniqueVersions);

    if (versionSet.size > 1 && TIER_1.includes(pkg)) {
      hasMismatch = true;
      log.warn(`${pkg}: versions differ across workspaces`);
      Object.entries(versions).forEach(([workspace, version]) => {
        console.log(`  ${workspace}: ${version}`);
      });
    }
  });

  if (!hasMismatch) {
    log.success('All Tier 1 packages are consistent across workspaces');
  }
}

function checkTierVersionPinning() {
  log.section('📌 Version Pinning Strategy Check');

  WORKSPACES.forEach((workspace) => {
    const pkg = readPackageJson(workspace);
    if (!pkg) return;

    console.log(`\n${colors.bold}${workspace}${colors.reset}`);

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Check Tier 1 should use ~
    TIER_1.forEach((name) => {
      const version = allDeps[name];
      if (!version) return;

      if (version.startsWith('^')) {
        log.warn(`Tier 1 ${name}@${version} uses ^ (caret); should use ~ (tilde)`);
      } else if (version.startsWith('~')) {
        log.success(`Tier 1 ${name}@${version} correctly pinned`);
      } else if (/^\d/.test(version)) {
        log.success(`Tier 1 ${name}@${version} exact pin (acceptable)`);
      }
    });

    // Check Tier 3 should use ~
    TIER_3.forEach((name) => {
      const version = allDeps[name];
      if (!version) return;

      if (version.startsWith('^')) {
        log.warn(`Tier 3 ${name}@${version} uses ^ (caret); recommend ~ (tilde)`);
      } else if (version.startsWith('~')) {
        log.success(`Tier 3 ${name}@${version} recommended pinning`);
      }
    });
  });
}

function checkOutdatedPackages() {
  log.section('🆕 Outdated Packages');

  try {
    const output = execSync('npm outdated --json', { encoding: 'utf-8' });
    const outdated = JSON.parse(output);

    if (Object.keys(outdated).length === 0) {
      log.success('All packages up to date');
      return;
    }

    Object.entries(outdated).forEach(([name, data]) => {
      const isWarning = TIER_1.includes(name) || TIER_3.includes(name);
      const msg = `${name}: ${colors.bold}${data.current}${colors.reset} → ${data.wanted} (latest: ${data.latest})`;
      
      if (isWarning) {
        log.warn(msg);
      } else {
        log.info(msg);
      }
    });
  } catch (err) {
    log.warn('Could not check for outdated packages');
  }
}

function printRecommendations() {
  log.section('💡 Recommendations');

  console.log(`
${colors.bold}Immediate Actions:${colors.reset}
1. Synchronize TypeScript version across apps/api and apps/web to ~5.9.3
2. Pin openai to ~6.27.0 (not ^) to prevent API breaking changes
3. Test OpenAI SDK upgrade path before any minor version bump

${colors.bold}Monthly Tasks:${colors.reset}
• npm outdated - review Tier 4 (utility) packages
• npm audit --production - check for security issues

${colors.bold}Quarterly (Every 3 months):${colors.reset}
• Review Tier 2 & 3 minor version updates
• Test in staging environment before merging

${colors.bold}Annual Review (January):${colors.reset}
• Plan major version upgrade strategies
• Discuss React 19→20, Express 4→5, Prisma 7→8 timelines
  `);
}

// Run all checks
async function main() {
  console.log(`\n${colors.bold}${colors.cyan}LeadFlowPro Dependency Audit${colors.reset}\n`);
  
  checkSecurityVulnerabilities();
  checkWorkspaceVersionSync();
  checkTierVersionPinning();
  checkOutdatedPackages();
  printRecommendations();

  console.log(`\n${colors.bold}For detailed information, see docs/DEPENDENCY_STRATEGY.md${colors.reset}\n`);
}

main().catch((err) => {
  log.error(`Audit failed: ${err.message}`);
  process.exit(1);
});
