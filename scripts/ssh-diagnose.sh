#!/usr/bin/env bash
set -euo pipefail
KEY="$HOME/.ssh/hauseoftech.pem"
HOST="admin@52.57.245.39"
REPO="/home/admin/barber-house-charm2"

ssh -i "$KEY" -o ConnectTimeout=15 "$HOST" bash -s <<'REMOTE'
set -euo pipefail
REPO="/home/admin/barber-house-charm2"
echo "=== git ==="
git -C "$REPO" log -1 --oneline || true
echo "=== tarball ==="
ls -lh "$REPO/apps/web/prebuilt-next.tar.gz" || true
echo "=== docker ps ==="
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -8
echo "=== web logs ==="
sudo docker logs haus-wellness-web-1 --tail 35 2>&1 || true
echo "=== inspect web image build ==="
sudo docker inspect haus-wellness-web-1 --format '{{.Image}}' 2>/dev/null || true
REMOTE
