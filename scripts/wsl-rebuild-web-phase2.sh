#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="${HOME}/.nvm"
. "${NVM_DIR}/nvm.sh"
nvm use 22

REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
BUILD_ROOT="${HOME}/haus-web-build"

echo "Syncing web sources..."
rsync -a --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude apps/web/.next \
  --exclude vendor \
  --exclude .git \
  --exclude "**/node_modules" \
  "$REPO/apps/web/" "$BUILD_ROOT/apps/web/"
rsync -a "$REPO/packages/contracts/" "$BUILD_ROOT/packages/contracts/"
# nav contracts used by generate / imports
cp -a "$REPO/package.json" "$REPO/pnpm-workspace.yaml" "$REPO/pnpm-lock.yaml" "$BUILD_ROOT/" 2>/dev/null || true

cd "$BUILD_ROOT"
export API_URL="${API_URL:-http://api:8080}"
pnpm --filter @haus/contracts build
pnpm --filter @haus/web build
echo "WEB REBUILD OK"
