#!/bin/bash

# Sync TypeScript version across all workspaces
# Usage: bash scripts/sync-typescript-versions.sh

TARGET_VERSION="~5.9.3"

echo "🔄 Syncing TypeScript to $TARGET_VERSION across workspaces..."

# Update apps/api
echo "Updating apps/api/package.json..."
cd apps/api
npm install typescript@"$TARGET_VERSION" --save-dev
cd ../..

# Update apps/web
echo "Updating apps/web/package.json..."
cd apps/web
npm install typescript@"$TARGET_VERSION" --save-dev
cd ../..

# Update root
echo "Updating root package.json (if present)..."
npm install typescript@"$TARGET_VERSION" --save-dev

echo "✅ TypeScript versions synchronized!"
echo ""
echo "Verification:"
echo "apps/api: $(grep '"typescript"' apps/api/package.json | grep -oE '~?[0-9]+\.[0-9]+\.[0-9]+')"
echo "apps/web: $(grep '"typescript"' apps/web/package.json | grep -oE '~?[0-9]+\.[0-9]+\.[0-9]+')"
