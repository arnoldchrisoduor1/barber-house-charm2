#!/usr/bin/env bash
set -euo pipefail
BUILD_ROOT="${HOME}/haus-web-build"
REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
echo "Dereferencing standalone into Windows tree..."
rm -rf "$REPO/apps/web/.next/standalone"
mkdir -p "$REPO/apps/web/.next"
cp -aL "$BUILD_ROOT/apps/web/.next/standalone" "$REPO/apps/web/.next/"
rm -rf "$REPO/apps/web/.next/static"
cp -a "$BUILD_ROOT/apps/web/.next/static" "$REPO/apps/web/.next/"
ls -la "$REPO/apps/web/.next/standalone/apps/web/node_modules/next/package.json"
du -sh "$REPO/apps/web/.next/standalone"
echo "DEREF OK"
