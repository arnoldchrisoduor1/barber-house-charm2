#!/usr/bin/env bash
# Rsync prebuilt Next.js standalone from WSL build dir to Linux VPS.
# Preserves symlinks (Linux → Linux). Do NOT use -L unless targeting Windows Docker.
set -euo pipefail

BUILD_ROOT="${BUILD_ROOT:-${HOME}/haus-web-build}"
DEPLOY_HOST="${DEPLOY_HOST:?set DEPLOY_HOST=user@your.server}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/${DEPLOY_HOST#*@}/barber-house-charm2}"

STANDALONE="${BUILD_ROOT}/apps/web/.next/standalone"
STATIC="${BUILD_ROOT}/apps/web/.next/static"

if [[ ! -d "$STANDALONE" ]]; then
  echo "Missing $STANDALONE — run scripts/wsl-build-web.sh first" >&2
  exit 1
fi

echo "Rsync web build → ${DEPLOY_HOST}:${DEPLOY_PATH}/apps/web/.next/"
ssh "$DEPLOY_HOST" "mkdir -p ${DEPLOY_PATH}/apps/web/.next/standalone ${DEPLOY_PATH}/apps/web/.next/static ${DEPLOY_PATH}/apps/web/public"

rsync -avz --delete \
  "$STANDALONE/" \
  "${DEPLOY_HOST}:${DEPLOY_PATH}/apps/web/.next/standalone/"

rsync -avz --delete \
  "$STATIC/" \
  "${DEPLOY_HOST}:${DEPLOY_PATH}/apps/web/.next/static/"

REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
if [[ -d "$REPO/apps/web/public" ]]; then
  rsync -avz \
    "$REPO/apps/web/public/" \
    "${DEPLOY_HOST}:${DEPLOY_PATH}/apps/web/public/"
fi

echo "✓ Web artifacts synced. On server run: bash scripts/deploy-server.sh"
