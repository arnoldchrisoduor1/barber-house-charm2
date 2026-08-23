#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${HOME}/.nvm"
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
nvm install 22
nvm use 22
node -v
command -v pnpm >/dev/null || npm i -g pnpm@9
pnpm -v

REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
cd "$REPO"

# Prefer Linux-native workspace copy to avoid OneDrive/NTFS symlink pain.
BUILD_ROOT="${HOME}/haus-web-build"
mkdir -p "$BUILD_ROOT"

echo "Syncing sources to $BUILD_ROOT ..."
rsync -a --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude 'apps/web/.next' \
  --exclude vendor \
  --exclude .git \
  --exclude '**/node_modules' \
  "$REPO/" "$BUILD_ROOT/"

cd "$BUILD_ROOT"
echo "pnpm install..."
pnpm install --frozen-lockfile || pnpm install

echo "Building contracts + web..."
pnpm --filter @haus/contracts build
# Bake Docker-compose service DNS into Next rewrites (evaluated at build time).
export API_URL="${API_URL:-http://api:8080}"
echo "API_URL=$API_URL"
pnpm --filter @haus/web build

echo "Copying standalone back to Windows tree (dereference symlinks for NTFS)..."
rm -rf "$REPO/apps/web/.next"
mkdir -p "$REPO/apps/web/.next"
# -L: materialize pnpm/next symlinks so Docker COPY on Windows works
cp -aL "$BUILD_ROOT/apps/web/.next/." "$REPO/apps/web/.next/"

test -f "$REPO/apps/web/.next/standalone/apps/web/server.js" \
  || test -f "$REPO/apps/web/.next/standalone/server.js"

echo "STANDALONE OK"
find "$REPO/apps/web/.next/standalone" -name 'server.js' | head -5

echo "Packaging dereferenced tarball for deploy..."
bash "$REPO/scripts/package-web-tarball.sh"
