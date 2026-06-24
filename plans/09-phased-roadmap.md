# 09 — Phased Roadmap

Vertical slices that each ship end-to-end (DB → API → web). Order favors de-risking tenancy + auth early.

## Phase 0 — Lock the model (1 week)

- Freeze route map, role names, feature keys, mode terms, entity list from the prototype.
- Author `packages/contracts/domain/*.json` (mode-terms, nav, features, pricing).
- Draft `openapi.yaml` (manual first) for auth + `/me` + bookings slice.
- **Exit:** contracts compile, TS client generates, both apps import shared domain JSON.

## Phase 1 — Platform skeleton (2 weeks)

- Monorepo bootstrap (pnpm + Turborepo + `go.work`), docker-compose (Postgres + Redis).
- Go: config, GORM + `OrgScope`, Redis, Fiber router, `/health`, error envelope.
- Auth module: register/login/refresh/logout, signup bootstrap tx, `GET /me`.
- Tenancy: organizations/members/branches + `ResolveOrganization`.
- Next.js: marketing shell, auth pages, protected `(dashboard)`/`(portal)` layouts calling real `/me`.
- CI: golangci-lint, gosec, ESLint, typecheck, unit tests on PR.
- **Exit:** real login → role redirect → empty dashboard, tenant-scoped.

## Phase 2 — Bookings + notifications (2–3 weeks)

- Booking CRUD, `booking_services`, availability + conflict rules, walk-in queue, waitlist.
- asynq: confirmation/reminder jobs (provider abstraction, sandbox).
- WS hub: queue board fanout (`org.{id}.queue`).
- Web: staff booking board (`DataTable` + calendar), public booking widget (signed org token + Turnstile).
- **Exit:** create/modify booking, live queue updates, reminder enqueued.

## Phase 3 — POS, Pesapal, ledger & payouts (3–4 weeks)

- `transactions`, tenders, gift cards, reconciliation.
- **Pesapal** order submit + IPN (verify via `GetTransactionStatus`, idempotent on merchant ref).
- **Double-entry ledger** + `tenant_wallets`: payment credits tenant wallet in same tx.
- **Payouts** module: Pesapal **OpenFloat** disbursement job (locked per tenant, idempotent, status reconciled).
- Feature gate `pos_payments` enforced on routes; client upgrade prompt.
- **Exit:** POS sale via M-Pesa/card/bank through Pesapal, tenant wallet credited, a test disbursement settles via OpenFloat, ledger balances, idempotent replays safe.

## Phase 4 — CRM, inventory, HR surfaces (3 weeks)

- Customers, loyalty, referrals, reviews; inventory, consumption, suppliers, retail products.
- Commissions, tips, payroll exports (async + S3 download link).
- **Exit:** loyalty accrual on completed booking, low-stock alerts, payroll PDF.

## Phase 5 — Enterprise + mode-specific (3 weeks)

- Multi-branch, audit log, advanced analytics (materialized views + read replica), API keys.
- Mode screens: coverage zones (mobile), patient intake/aftercare (clinic), session notes/progress (therapy), products store + shop-orders.
- All 9 nav manifests live, including `solo_pro` + merged multi-mode.
- **Exit:** each mode renders correct nav/terms/theme/screens; enterprise gates work.

## Phase 6 — Hardening & scale (ongoing)

- k6 load tests on `/book` + `/mpesa/callback`, chaos drills, backup/restore runbook, pen-test remediation.
- PWA/offline for mobile mode (optional). Calling service (optional).

## Definition of Done (per slice merged to `main`)

1. OpenAPI updated; TS client regenerated; shared domain JSON in sync.
2. Go: validator on DTOs, `authz` policy + `RequireFeature` where applicable, repository `OrgScope` test, service unit tests, integration test against testcontainers Postgres.
3. Web: RSC prefetch or TanStack hooks with loading/error/empty states; a11y pass on primary path.
4. Idempotency documented for any payment/webhook path.
5. Tenant-isolation test: a user from org A cannot read/write org B data on the new endpoints.
6. Runbook entry for new env vars + failure modes; load-test ticket if it's a hot path.
