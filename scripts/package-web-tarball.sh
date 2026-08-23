#!/usr/bin/env bash
# Pack Next standalone into prebuilt-next.tar.gz (preserve pnpm symlinks for Linux Docker).
set -euo pipefail

REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
BUILD_ROOT="${BUILD_ROOT:-${HOME}/haus-web-build}"
NEXT_DIR="$BUILD_ROOT/apps/web/.next"

if [[ ! -f "$NEXT_DIR/standalone/apps/web/server.js" && ! -f "$NEXT_DIR/standalone/server.js" ]]; then
  echo "Missing standalone build — run scripts/wsl-build-web.sh first" >&2
  exit 1
fi

echo "Creating prebuilt-next.tar.gz (symlinks preserved) ..."
tar -czf "$REPO/apps/web/prebuilt-next.tar.gz" -C "$NEXT_DIR" standalone static

ls -lh "$REPO/apps/web/prebuilt-next.tar.gz"
echo "Verify symlinks in tarball:"
tar -tzf "$REPO/apps/web/prebuilt-next.tar.gz" | grep 'standalone/apps/web/node_modules/next$' | head -1
echo "PACK OK"
