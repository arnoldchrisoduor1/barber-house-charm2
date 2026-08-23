#!/usr/bin/env bash
# Cross-compile API binaries for Linux amd64 and pack for git/deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/apps/api/prebuilt/linux-amd64"

mkdir -p "$OUT"

export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0
export GOFLAGS=-mod=vendor

echo "Building linux/amd64 binaries..."
cd "$ROOT/apps/api"
go build -o "$OUT/api" ./cmd/api
go build -o "$OUT/worker" ./cmd/worker
go build -o "$OUT/migrate" ./cmd/migrate
go build -o "$OUT/seed" ./cmd/seed

echo "Packaging prebuilt-api.tar.gz..."
tar -czf "$ROOT/apps/api/prebuilt-api.tar.gz" -C "$ROOT/apps/api/prebuilt" linux-amd64

ls -lh "$OUT"/{api,worker,migrate,seed}
ls -lh "$ROOT/apps/api/prebuilt-api.tar.gz"
file "$OUT/api"
echo "API PREBUILD OK"
