#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/hauseoftech.pem}"
HOST="${DEPLOY_HOST:-admin@52.57.245.39}"

ssh -i "$KEY" -o ConnectTimeout=15 "$HOST" bash -s <<'REMOTE'
set -euo pipefail
echo "=== docker ps ==="
sudo docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo
echo "=== web logs (last 30) ==="
sudo docker logs haus-wellness-web-1 --tail 30 2>&1 || true
echo
echo "=== caddy logs (last 20) ==="
sudo docker logs haus-wellness-caddy-1 --tail 20 2>&1 || true
echo
echo "=== curl checks ==="
curl -sf -o /dev/null -w "localhost:3000/login -> %{http_code}\n" http://127.0.0.1:3000/login || echo "localhost:3000 FAILED"
curl -sf -o /dev/null -w "hauseoftech.com -> %{http_code}\n" https://hauseoftech.com/login || echo "hauseoftech.com FAILED"
curl -sf https://api.hauseoftech.com/health || echo "api health FAILED"
echo
echo "=== port listeners ==="
sudo ss -tlnp | grep -E ':80|:443|:3000' || true
REMOTE
