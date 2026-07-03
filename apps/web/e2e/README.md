# Playwright E2E Tests

End-to-end tests for Haus of Wellness web app + API proxy.

## Prerequisites

Use the **production Next.js container** for E2E — not `next dev`. Dev mode compiles routes on first visit and slows the suite dramatically.

### Recommended: production stack (Docker)

From `apps/web`:

```bash
# First run or after frontend changes (builds web image)
npm run e2e:stack:up:build

# Subsequent runs (reuses images)
npm run e2e:stack:up

# Run tests against http://localhost:3001 (production web on port 3001)
E2E_PROD=1 npm run test:e2e

# One-shot: start stack + full suite
npm run test:e2e:prod:build   # first time
npm run test:e2e:prod         # cached images

# Tear down when finished
npm run e2e:stack:down
```

**Stop any local `next dev` on port 3001** before starting the stack — only one process can bind that port.

The `web` service serves a pre-built standalone Next.js app (`infra/docker/Dockerfile.web`). API + Postgres + Redis run in the same compose file.

### Manual stack (equivalent)

```bash
docker compose -f infra/docker/compose.yml up -d --build postgres redis mailhog minio migrate api web
docker compose -f infra/docker/compose.yml run --rm api /app/seed
```

2. Install browsers (from `apps/web`):

```bash
npm install
npx playwright install chromium   # or chrome if using PLAYWRIGHT_CHANNEL=chrome
```

## Run tests

```bash
cd apps/web

# Git Bash / Linux / macOS
export PLAYWRIGHT_BASE_URL=http://localhost:3001
export PLAYWRIGHT_API_URL=http://localhost:18432
export PLAYWRIGHT_CHANNEL=chromium   # optional; default is chrome

npm run test:e2e
```

```powershell
# PowerShell — against production Docker web (port 3001)
$env:PLAYWRIGHT_BASE_URL="http://localhost:3001"
$env:PLAYWRIGHT_API_URL="http://localhost:18432"
$env:E2E_PROD="1"
npm run test:e2e
```

### Fast smoke only

```bash
npm run test:e2e:smoke
```

### Interactive UI

```bash
npm run test:e2e:ui
```

### 2FA tests (optional, requires MailHog)

```bash
E2E_RUN_2FA=1 npm run test:e2e -- --project=twofa
```

## Demo credentials

| Variable | Default |
|----------|---------|
| `E2E_DEMO_EMAIL` | `arnoldchris262@gmail.com` |
| `E2E_DEMO_PASSWORD` | `Admin123!` |

## Project layout

| Project | Specs | Auth |
|---------|-------|------|
| `setup` | `auth.setup.ts` | Logs in, saves `e2e/.auth/user.json` |
| `public` | `smoke/public-routes.spec.ts` | None |
| `landing` | `flows/landing-register.spec.ts` | None |
| `smoke` | `smoke/authenticated-routes.spec.ts`, `admin-routes.spec.ts` | Session |
| `flows` | auth, register, theme, core, settings, special-pages | Session |
| `crud` | `crud-flows.spec.ts` | Session |
| `api` | `api.spec.ts` | Session |
| `gating` | `gating.spec.ts` | Session |
| `twofa` | `flows/twofa-flows.spec.ts` | Session (opt-in) |

## Adding tests for new sections

1. Add route to nav manifest (if sidebar item).
2. Regenerate route list: `npm run generate:e2e-routes`.
3. Add CRUD entry to `e2e/crud-manifest.ts` if using `CrudModulePage`.
4. Register new spec in `playwright.config.ts` if creating a new file.
5. Run full suite before merge.

See `.cursor/rules/e2e-playwright.mdc` for project rules.

## Reports

```bash
npx playwright show-report
```
