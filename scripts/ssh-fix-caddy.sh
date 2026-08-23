#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/hauseoftech.pem}"
HOST="${DEPLOY_HOST:-admin@52.57.245.39}"
REPO="/home/admin/barber-house-charm2"

ssh -i "$KEY" -o ConnectTimeout=15 "$HOST" bash -s <<REMOTE
set -euo pipefail
cd $REPO
git pull origin main
cd infra/docker
sudo docker compose -f compose.yml -f compose.prod.yml up -d --force-recreate caddy web
sleep 8
sudo docker logs haus-wellness-caddy-1 --tail 5 2>&1
curl -sf -o /dev/null -w "hauseoftech.com/login -> %{http_code}\n" https://hauseoftech.com/login
curl -sf -o /dev/null -w "www.hauseoftech.com -> %{http_code}\n" https://www.hauseoftech.com/login
REMOTE
