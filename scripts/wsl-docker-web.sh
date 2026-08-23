#!/usr/bin/env bash
set -euo pipefail
BUILD_ROOT="${HOME}/haus-web-build"
REPO="/mnt/c/Users/arnol/OneDrive/Desktop/barber-house-charm2"
CTX="${HOME}/docker-web-ctx"
rm -rf "$CTX"
mkdir -p "$CTX/apps/web/.next" "$CTX/infra/docker"
cp -a "$BUILD_ROOT/apps/web/.next/standalone" "$CTX/apps/web/.next/"
cp -a "$BUILD_ROOT/apps/web/.next/static" "$CTX/apps/web/.next/"
cp -a "$REPO/apps/web/public" "$CTX/apps/web/"
cp "$REPO/infra/docker/Dockerfile.web" "$CTX/infra/docker/"
cp "$REPO/infra/docker/docker-entrypoint-web.sh" "$CTX/infra/docker/"
printf '%s\n' '**/*.md' > "$CTX/.dockerignore"
echo "Context size:"
du -sh "$CTX" "$CTX/apps/web/.next/standalone"
find "$CTX/apps/web/.next/standalone" -path '*styled-jsx/package.json' | head -5
echo "Building image from WSL context..."
cd "$CTX"
docker build -f infra/docker/Dockerfile.web -t haus-wellness-web:latest .
echo "DOCKER WEB BUILD OK"
