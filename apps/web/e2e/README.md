# Playwright E2E Tests

End-to-end tests for Haus of Wellness web app + API proxy.

## Prerequisites

1. Start the stack from repo root:

```bash
docker compose -f infra/docker/compose.yml up -d --build
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
# PowerShell
$env:PLAYWRIGHT_BASE_URL="http://localhost:3001"
$env:PLAYWRIGHT_API_URL="http://localhost:18432"
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
