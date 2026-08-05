# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Haus of Wellness — multi-tenant SaaS for grooming/beauty/wellness/retail. **9 business modes** share one core domain, re-skinned per mode (labels, nav, theme, a few special screens). Spa mode brand = "Haus of Spa"; multi-mode umbrella = "Haus of Wellness". Tenancy via subdomain `{slug}.hausofwellness.com`.

Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui frontend; Go + Fiber + GORM backend; Postgres 16 + Redis 7; jobs via asynq; realtime via Go WebSocket hub. Payments: Pesapal (collect) + OpenFloat (disburse) with a double-entry ledger. Storage: MinIO (dev) / R2-S3 (prod). SMS: Africa's Talking. WhatsApp: Meta Cloud API. Maps: Google Maps.

This is a monorepo: `apps/web` (Next.js), `apps/api` (Go module `github.com/haus-of-wellness/api`), `packages/contracts` (shared OpenAPI + domain JSON), `infra/` (docker, migrations, k6, runbooks). `docs/` is a separate, unrelated Vite project (not part of the pnpm/turbo workspace).

**Sources of truth (read before building):**
- Build plans: `plans/*.md`, start at `plans/README.md`.
- Product rules + schema + routes: `docs/public/docs-sources/*.md`.
- Real UI, design tokens, domain logic, original Supabase schema: sibling repo `../barber-house-charm` (Vite prototype this app is being ported from).
- Stack translation Laravel/Supabase → Go: `plans/08-laravel-supabase-to-go-mapping.md`.
- Design tokens: `plans/10-design-system-tokens.md`.

When docs (Laravel-oriented) and the prototype (Supabase-oriented) conflict, prefer the prototype for UI/domain shapes, then reconcile through the mapping doc to the actual Go stack.

## Commands

Root (turbo-orchestrated across workspace):
```
pnpm install
pnpm dev / pnpm build / pnpm lint / pnpm typecheck / pnpm test
pnpm contracts:gen        # regenerate packages/contracts TS client from OpenAPI
```

Contracts (`packages/contracts`) — regenerate whenever `openapi/openapi.yaml` or `domain/*.json` change:
```
npm run generate --prefix packages/contracts   # openapi-typescript + tsc
```

API (`apps/api`, Go):
```
cd apps/api
go build ./...
go test ./...                       # needs DATABASE_URL against a real Postgres (testcontainers-go)
go test ./internal/modules/booking/...   # single package
go run ./cmd/api
go run ./cmd/migrate up             # golang-migrate against infra/migrations
go run ./cmd/seed
golangci-lint run && gofumpt -l .
gosec ./... && govulncheck ./...
```

Web (`apps/web`, Next.js):
```
cd apps/web
npm run dev / npm run build / npm run start
npm run lint
npm run typecheck
node scripts/check-nav-routes.mjs             # nav manifest sanity (CI-enforced)
node scripts/generate-e2e-routes.mjs --check  # e2e route sync check (CI-enforced)
```

E2E (Playwright, `apps/web/e2e/`) — **always run against the production Docker web container, never `next dev`** (dev compiles on demand and is too slow for the suite):
```
cd apps/web
npm run e2e:stack:up:build     # first run / after frontend changes
npm run e2e:stack:up           # subsequent runs
E2E_PROD=1 npm run test:e2e    # full suite
npm run test:e2e:smoke         # setup+public+smoke+landing projects only
npx playwright test path/to.spec.ts   # single spec
npm run e2e:stack:down
```
Full docs: `apps/web/e2e/README.md`.

Docker (full stack, `infra/docker/`):
```
docker compose -f infra/docker/compose.yml up -d --build
docker compose -f infra/docker/compose.yml run --rm migrate
docker compose -f infra/docker/compose.yml run --rm api /app/seed
```
Services: web `:3000` (dev) / `:3001` (prod container used by E2E), API `:8080` (health) / `:18432` (E2E), MinIO console `:9001` (`minio`/`minio12345`), Postgres `:5432` (`haus`/`haus`).

CI (`.github/workflows/ci.yml`) runs 4 jobs: `contracts` (generate + diff-check `features.json` is in sync between `packages/contracts` and `apps/api/contracts`), `api` (build + test against real Postgres service), `web` (nav-routes check, e2e-routes check, build), `e2e` (full docker compose stack + Playwright smoke).

## Architecture

### Tenant isolation — the #1 invariant

Supabase RLS is gone; isolation is enforced in **two independent layers**, both required:
1. Org id comes only from authenticated membership / validated path param (`c.Locals("org_id")`, set by `ResolveOrganization` middleware) — **never** from request body.
2. Every tenant-table query goes through `db.Scopes(tenancy.OrgScope(orgID))`. Raw `db.Find/First/Updates/Delete` on tenant models is forbidden outside repositories.

The only unauthenticated path is public booking (`/book/[orgSlug]`), scoped via a signed org JWT (`org_id`, `exp`, `nonce`) + Turnstile + rate limit — never a raw `organization_id` param. Every new endpoint needs a test proving org A cannot touch org B data.

Other security musts: re-check `RequireFeature`/`RequireRole` server-side on every protected mutation (client gating is cosmetic); Idempotency-Key (Redis SETNX) on payment/webhook routes; Pesapal IPN is idempotent on `OrderMerchantReference` and the body is **never trusted** — always re-query `GetTransactionStatus`, and the server always computes the order amount itself; argon2id password hashing; httpOnly cookie tokens; secrets from a manager, never git; mask phone/PII in non-security logs; `audit_log` is append-only.

### Backend — Go + Fiber modular monolith

One module per domain under `apps/api/internal/modules/<name>/` (booking, pos, inventory, crm, staff, payroll, payouts, ledger, marketing, notifications, integrations, platform, etc.), each with `handler.go`, `service.go`, `repository.go`, `model.go`, `dto.go`, `routes.go`, `events.go`.

Strict layering, never skip:
- **Handlers** bind + validate + authorize + respond; never touch GORM directly.
- **Services** hold business rules, call repository *interfaces* (not `*gorm.DB`), enabling testability.
- **Repositories** own all queries and apply `tenancy.OrgScope`.
- Cross-module writes go through services + domain events, never another module's repo directly.

Conventions: routes under `/api/v1`, resource-style (`/api/v1/organizations/{org}/bookings`); errors are RFC 7807 `application/problem+json` via `httpx.Problem`/`httpx.From`; DTOs validated with `go-playground/validator`, never bind straight into GORM models; always derive `context.Context` via `c.UserContext()` (fasthttp `Ctx` ≠ `net/http`); cursor pagination for high-churn lists, offset only for small admin lists; no `panic` for control flow, wrap errors with `%w`.

GORM/data: models embed a `Base` (`ID uuid` default `gen_random_uuid()`, `CreatedAt`, `UpdatedAt`); tenant models add `OrganizationID uuid.UUID` with a composite index leading with it; money is integer KES; Postgres enum types kept in sync with `infra/migrations`. Migrations are reviewed golang-migrate SQL pairs (`.up.sql`/`.down.sql`) in `infra/migrations`; `AutoMigrate` only when `APP_ENV=local`, never authoritative in ci/staging/prod. Zero-downtime pattern: expand → dual-write → backfill (async) → switch reads → contract. Eager-load explicitly (`Preload("Services")`), never blanket `Preload(clause.Associations)`; multi-row mutations wrapped in `db.Transaction`.

Logging: structured JSON via `log/slog` (or zerolog), never `fmt.Println`/bare `log`. Middleware order: `requestid` → `recover` → request logger → auth → tenancy. Every request-path log line carries `request_id`; domain events (`booking_created`, `payment_ipn_received`, `payout_submitted`, `subscription_changed`) logged at `info` with ids, never full PII. External calls (Pesapal, OpenFloat, Africa's Talking, Meta, Google, S3) logged on send + response with provider/endpoint/status/latency/correlation id, secrets redacted. `/health` (DB+Redis ping) and `/metrics` (not public) endpoints; OpenTelemetry span per request + external call + DB query group.

A separate **platform admin console** (`admin.` subdomain, `platform_admin` role, `/api/v1/platform/*`) runs the SaaS itself and manages feature flags — distinct from tenant-facing app.

### Frontend — Next.js App Router

Porting the Vite prototype (`../barber-house-charm`): keep its design + domain logic, swap router (Vite→Next) and data layer (Supabase→typed API client).

Route groups: `(marketing)`, `(public)` (book + shop), `(auth)`, `(portal)`, `(dashboard)`; `onboarding` and `select-plan` are post-login with no shell. Server Components for read-mostly aggregation pages (parallel server fetch); Client Components reserved for calendars, drag-drop, POS keypad, QR scanner, chat, maps, command palette, framer-motion.

All data access goes through the typed client in `lib/api-client.ts` (generated from `packages/contracts`) — no direct DB access. TanStack Query, keys `['org', orgId, entity, params]`; org id comes from `GET /me`. Realtime: subscribe to the WS hub, then `setQueryData` patch or targeted `invalidateQueries`. No Server Action re-implements a business rule — at most a thin BFF proxy to Go with Zod validation.

Thin pages (fetch + layout only; logic lives in `components/<feature>/` + hooks). Shared `<DataTable>` for columns/data/pagination/sort/filter — don't re-roll `ui/table.tsx` per page. Every async surface needs loading/error/**empty** states, no silent demo fallback.

### Contracts — `packages/contracts` is the shared source of truth

Both apps consume it; they must never drift.
- `openapi/openapi.yaml` is authoritative for routes/params/shapes/error envelope. Workflow: update spec first → regenerate TS client (`ts/`) → implement Go handlers to match. Versioned `/api/v1`; breaking changes ship as `/api/v2` with overlap.
- `domain/mode-terms.json` — staff/client/booking/station labels per mode (9 modes + mixed), ported from prototype's `MODE_TERMS`.
- `domain/nav/*.json` — nav manifest keyed by `{mode, role}`, items `{path, label, section, roles[], requiredFeature?}`.
- `domain/features.json` — the one feature registry (see below).
- `domain/pricing.json` — `BASE_MONTHLY_KES`, billing cycles/discounts, currency table.

Never duplicate these constants inside a component or Go module — always import from contracts. Web reads them for rendering; Go embeds the same JSON for authoritative entitlement/charge checks. CI diff-checks `packages/contracts/domain/features.json` against `apps/api/contracts/domain/features.json` — keep them in sync (regenerate, don't hand-edit both).

### Feature flags — every capability is a flag

Single registry `packages/contracts/domain/features.json`, entries: `key, label, description, category, minPlan, default, dependsOn, status (ga|beta|deprecated)`. Plan order: `solo_pro < starter < professional < enterprise`. Backend mirrors it in DB: `features` (catalog), `organization_features` (per-org override), `feature_flags` (global kill-switch/% rollout).

Resolution is server-only (`/me` returns effective `features[]`), precedence: global kill-switch off (always wins) → per-org override → plan entitlement (`minPlan` vs org plan) → `default`; then any disabled `dependsOn` disables the feature too. Client never computes entitlement.

Guard pattern: backend `RequireFeature("key")` middleware **and** a service-level check before gated writes — unknown key = disabled (fail-closed). Frontend `useFeature("key")` / `<Feature flag="key" fallback={...}>`. Adding a feature = new registry entry, default off — never hardcode a feature boolean or `if (plan === 'enterprise')` anywhere. Removing/disabling: nav item disappears, route returns unavailable (404/redirect), component renders `null` — no throw, no crash, no dangling import. Mark `deprecated` before removal; remove gated code in the same change as the registry removal.

### Design system

Dark-first luxury wellness. Tokens ported verbatim from `../barber-house-charm/src/index.css` + `tailwind.config.ts` (full spec `plans/10-design-system-tokens.md`) — do not redesign. Colors are HSL channel triplets via `hsl(var(--token))`; base `--primary: 38 80% 55%` (gold), `--radius: 0.75rem`. Fonts: `font-display` = Instrument Serif (hero/display), `font-heading`/`font-body` = Inter, `font-mono` = JetBrains Mono (eyebrow labels), via `next/font`. Use semantic Tailwind colors (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `bg-card`, `sidebar-*`) — avoid raw hex.

Per-mode theming: class on `<html>` — `theme-beauty|theme-spa|theme-nail|theme-clinic|theme-mobile|theme-therapy|theme-solo|theme-both` (barber = base, no class; `theme-products` is missing and needs adding). Spa = teal `--primary: 170 55% 38%`; multi-mode `theme-both` = rose-gold. `.light` class toggles light mode (dark is default); persist `haus-theme` in localStorage.

Signature utilities: `.glass`, `.glass-strong`, `.mesh-aurora`, `.mesh-ambient`, `.stat-tile`, `.nav-pill`, `.label-eyebrow`, `.text-gradient-gold`, `.text-gradient-aurora`, `.shadow-gold`, `.shadow-glow`. KPI cards use `.stat-tile`, sidebar items `.nav-pill`, section eyebrows mono uppercase `.label-eyebrow`. Charts via `ui/chart.tsx` (Recharts); animations via framer-motion in client components only.

### Web app best practices (apps/web)

PWA: manifest + installable icons, theme-color matches active mode theme; service worker precaches app shell, stale-while-revalidate for API GETs, network-first for mutations; offline fallback + Background Sync only for safe idempotent writes (mobile/field-staff mode benefits most); never cache authenticated PII in the SW without scoping + short TTL.

Always paginate lists (cursor for high-churn like bookings/notifications, offset for small admin tables) — no unbounded find-all. `next/dynamic` (`ssr:false` for browser-only libs) for heavy widgets (charts, calendar, maps, QR scanner, command palette). `next/image` everywhere; store original + thumbnail, lists request thumb. Core Web Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1 — reserve space for async content to avoid layout shift.

### E2E testing is mandatory for new user-facing surfaces

Every new sidebar section, dashboard page, auth flow, or public route must ship Playwright coverage in the same change (or immediately after) — no merge without it. Per change type:
- New nav manifest path → `npm run generate:e2e-routes` (updates `e2e/generated/nav-routes.ts`).
- New CRUD module → entry in `e2e/crud-manifest.ts` + lifecycle in `crud-flows.spec.ts`.
- New non-nav page → spec in `e2e/smoke/` or `e2e/flows/`, wired in `playwright.config.ts`.
- New auth/security flow → spec under `e2e/flows/`.
- New API surface used by UI → assert in `e2e/api.spec.ts` or via page interaction.

Every `*.spec.ts` must be wired in `playwright.config.ts` — orphan specs don't run. Skip live Pesapal, OpenFloat, live WhatsApp, Calendly in tests. Shared creds in `e2e/fixtures.ts` (`E2E_DEMO_*` overrides); authenticated tests use `auth.setup.ts` → `e2e/.auth/user.json`.
