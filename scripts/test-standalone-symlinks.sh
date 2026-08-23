#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="${HOME}/.nvm"
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
nvm use 22

STAGE="${HOME}/standalone-test"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "${HOME}/haus-web-build/apps/web/.next/standalone/." "$STAGE/"

cd "$STAGE/apps/web"
echo "Testing server.js with symlinks preserved..."
timeout 10 node server.js 2>&1 | head -20 || true
