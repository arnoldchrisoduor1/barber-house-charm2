#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up Postgres to $BACKUP_DIR/haus-$TS.sql"
docker compose -f infra/docker/compose.yml exec -T postgres \
  pg_dump -U haus haus > "$BACKUP_DIR/haus-$TS.sql"

echo "Backup complete."
