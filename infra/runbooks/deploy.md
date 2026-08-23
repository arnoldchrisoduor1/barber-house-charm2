# Deploy runbook — prebuilt web + Docker API on Linux VPS

Production domains: **hauseoftech.com** (web) · **api.hauseoftech.com** (API)

## Architecture

| Layer | Where it runs | Notes |
|-------|---------------|-------|
| Next.js (standalone) | Prebuilt on **WSL**, rsync'd to server | Not built inside Docker on Windows |
| Go API / worker / migrate | Built on server via `Dockerfile.api` | Uses committed `vendor/` (offline build) |
| Postgres, Redis, MinIO | Docker on server | Bound to localhost in prod override |
| TLS | Caddy container | Auto Let's Encrypt |

## Why WSL for the frontend build?

Next.js `output: "standalone"` with **pnpm** creates **symlinks** inside `.next/standalone`.

| Target | Symlinks |
|--------|----------|
| **Linux VPS (recommended)** | Build in WSL → `rsync -a` WSL → server. Symlinks stay valid on Linux. |
| **Windows Docker Desktop** | Symlinks break on NTFS / `docker build` COPY. Use `cp -aL` (dereference) — see `scripts/wsl-deref-standalone.sh`. |

**Summary:** WSL build is required on Windows. For a **Linux server**, rsync the WSL output with symlinks intact (`rsync -a`, not `-L`). Dereference only when building the web image on Windows Docker.

`.next` is **gitignored** — never commit it. Transfer via rsync after each frontend release.

---

## One-time server setup

```bash
# On VPS (Ubuntu)
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# re-login

git clone git@github.com:arnoldchrisoduor1/barber-house-charm2.git
cd barber-house-charm2/infra/docker
cp .env.example .env
nano .env   # fill secrets (JWT, POSTGRES_PASSWORD, SMTP, S3)

# DNS: A records for hauseoftech.com, www, api → server IP
```

---

## Release flow (every deploy)

### 1. Prebuild web in WSL (dev machine)

```bash
# In WSL
bash scripts/wsl-build-web.sh
```

This syncs sources to `~/haus-web-build`, runs `pnpm install`, builds contracts + web with `API_URL=http://api:8080` (Docker internal DNS for Next rewrites).

Verify:

```bash
test -f ~/haus-web-build/apps/web/.next/standalone/apps/web/server.js \
  || test -f ~/haus-web-build/apps/web/.next/standalone/server.js
```

### 2. Push source to GitHub (no .next)

```bash
# Windows or WSL, from repo root
git add -A
git commit -m "..."
git push origin main
```

Ensure `vendor/` and the fixed `.dockerignore` are committed.

### 3. Rsync prebuilt web to server

```bash
# WSL — replace USER and HOST
export DEPLOY_HOST=USER@your.vps.ip
export DEPLOY_PATH=/home/USER/barber-house-charm2

bash scripts/rsync-web-to-server.sh
```

Uses `rsync -a` (preserves symlinks Linux → Linux).

### 4. Pull + build + run on server

```bash
ssh $DEPLOY_HOST
cd barber-house-charm2
bash scripts/deploy-server.sh
```

Or manually:

```bash
cd barber-house-charm2
git pull origin main
cd infra/docker
docker compose -f compose.yml -f compose.prod.yml build api web worker
docker compose -f compose.yml -f compose.prod.yml run --rm migrate
docker compose -f compose.yml -f compose.prod.yml up -d
```

First deploy only (demo data):

```bash
docker compose -f compose.yml -f compose.prod.yml run --rm api /app/seed
```

### 5. Smoke test

```bash
curl -sf https://api.hauseoftech.com/health
curl -sf -o /dev/null -w "%{http_code}\n" https://hauseoftech.com/login
```

---

## Local Docker (dev) vs production

| | Dev | Production |
|---|-----|------------|
| Compose | `compose.yml` only | `compose.yml` + `compose.prod.yml` |
| MailHog | yes | disabled (profile `dev`) |
| Exposed ports | 15432, 18432, 3001, … | 80/443 (Caddy), rest localhost |
| Secrets | hardcoded dev defaults | `infra/docker/.env` |

---

## Troubleshooting

**Web container: `server.js not found`**
- `.next/standalone` missing on server → re-run WSL build + rsync.
- Built on Windows without dereference → use WSL build or `scripts/wsl-deref-standalone.sh`.

**API build: `vendor` missing**
- Run `go work vendor` at repo root and commit `vendor/`.

**Docker web build: empty `.next`**
- Committed `.dockerignore` must **not** exclude `apps/web/.next`.

**Invite emails not sent**
- Set real SMTP in `.env`, `EMAIL_DRY_RUN=false`. See `docs/ops-smtp-checklist.md`.
