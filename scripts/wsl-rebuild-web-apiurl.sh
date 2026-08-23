#!/usr/bin/env bash
set -euo pipefail
export NVM_DIR="${HOME}/.nvm"
# shellcheck disable=SC1091
. "${NVM_DIR}/nvm.sh"
nvm use 22
cd "${HOME}/haus-web-build"
export API_URL="${API_URL:-http://api:8080}"
echo "Rebuilding web with API_URL=$API_URL"
pnpm --filter @haus/web build
echo "WEB REBUILD OK"
