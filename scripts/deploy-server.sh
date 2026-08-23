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
  if [[ -f "$ROOT/apps/web/prebuilt-next.tar.gz" ]]; then
    echo "Extracting prebuilt-next.tar.gz..."
    mkdir -p "$ROOT/apps/web/.next"
    tar -xzf "$ROOT/apps/web/prebuilt-next.tar.gz" -C "$ROOT/apps/web/.next"
  else
    echo "Missing apps/web/.next/standalone or prebuilt-next.tar.gz" >&2
    exit 1
  fi
fi

if [[ ! -f "$ROOT/apps/api/prebuilt/linux-amd64/api" ]]; then
  if [[ -f "$ROOT/apps/api/prebuilt-api.tar.gz" ]]; then
    echo "Extracting prebuilt-api.tar.gz..."
    mkdir -p "$ROOT/apps/api/prebuilt"
    tar -xzf "$ROOT/apps/api/prebuilt-api.tar.gz" -C "$ROOT/apps/api/prebuilt"
  else
    echo "Missing apps/api/prebuilt/linux-amd64/api or prebuilt-api.tar.gz" >&2
    exit 1
  fi
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
