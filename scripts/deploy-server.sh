#!/usr/bin/env bash
# Run ON THE VPS after git pull + rsync of apps/web/.next
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/infra/docker"

COMPOSE="docker compose -f compose.yml -f compose.prod.yml"

if [[ ! -f .env ]]; then
  echo "Missing infra/docker/.env — copy from .env.example and fill secrets" >&2
  exit 1
fi

if [[ ! -d "$ROOT/apps/web/.next/standalone" ]]; then
  echo "Missing apps/web/.next/standalone — rsync prebuilt web from WSL first" >&2
  exit 1
fi

if [[ ! -d "$ROOT/vendor" ]]; then
  echo "Missing vendor/ — run 'go work vendor' at repo root and commit, or pull latest main" >&2
  exit 1
fi

echo "Building API + web images..."
$COMPOSE build api web worker

echo "Running migrations..."
$COMPOSE run --rm migrate

echo "Starting stack..."
$COMPOSE up -d

echo "Waiting for API health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8080/health >/dev/null 2>&1; then
    echo "✓ API healthy"
    break
  fi
  sleep 2
done

echo "Done. Check: curl https://api.hauseoftech.com/health"
