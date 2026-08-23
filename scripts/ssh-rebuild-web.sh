#!/usr/bin/env bash
# Rebuild web on VPS after git pull.
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/hauseoftech.pem}"
HOST="${DEPLOY_HOST:-admin@52.57.245.39}"
REPO="/home/admin/barber-house-charm2"

ssh -i "$KEY" -o ConnectTimeout=15 "$HOST" bash -s <<REMOTE
set -euo pipefail
cd $REPO
git pull origin main
cd infra/docker
sudo docker compose -f compose.yml -f compose.prod.yml build web --no-cache
sudo docker compose -f compose.yml -f compose.prod.yml up -d web caddy
sleep 5
sudo docker logs haus-wellness-web-1 --tail 15
curl -sf -o /dev/null -w "web localhost: %{http_code}\n" http://127.0.0.1:3000/login || true
curl -sf -o /dev/null -w "public: %{http_code}\n" https://hauseoftech.com/login || true
REMOTE
