#!/usr/bin/env bash
# Pack dereferenced Next standalone into prebuilt-next.tar.gz (safe for Linux Docker).
set -euo pipefail

REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
BUILD_ROOT="${BUILD_ROOT:-${HOME}/haus-web-build}"
STAGE="${HOME}/haus-web-pack"

SRC_STANDALONE="$BUILD_ROOT/apps/web/.next/standalone"
SRC_STATIC="$BUILD_ROOT/apps/web/.next/static"

if [[ ! -f "$SRC_STANDALONE/apps/web/server.js" && ! -f "$SRC_STANDALONE/server.js" ]]; then
  echo "Missing standalone build — run scripts/wsl-build-web.sh first" >&2
  exit 1
fi

echo "Staging dereferenced standalone to $STAGE ..."
rm -rf "$STAGE"
mkdir -p "$STAGE"
# -L: materialize all pnpm symlinks so Docker/Linux never sees broken links
cp -aL "$SRC_STANDALONE" "$STAGE/standalone"
cp -a "$SRC_STATIC" "$STAGE/static"

echo "Checking for broken symlinks..."
if find "$STAGE/standalone" -type l ! -exec test -e {} \; -print 2>/dev/null | grep -q .; then
  echo "ERROR: broken symlinks remain after cp -aL" >&2
  find "$STAGE/standalone" -type l ! -exec test -e {} \; -print
  exit 1
fi

echo "Creating prebuilt-next.tar.gz ..."
tar -czf "$REPO/apps/web/prebuilt-next.tar.gz" -C "$STAGE" standalone static

du -sh "$STAGE/standalone" "$REPO/apps/web/prebuilt-next.tar.gz"
echo "PACK OK"
