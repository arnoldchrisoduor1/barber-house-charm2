# 08 — Translation Map: Laravel / Supabase → Go + Fiber

The docs target Laravel; the prototype runs on Supabase. This is the canonical mapping to our Go stack. Use it whenever a doc or prototype file references the old stack.

## Stack-level

| Docs (Laravel) / Prototype (Supabase) | Go + Fiber replacement |
|----------------------------------------|------------------------|
| Laravel 11 / PHP-FPM | Go service binary (Fiber, fasthttp) |
| Eloquent ORM + global scopes | **GORM** + `OrgScope` repository pattern |
| Laravel migrations | **golang-migrate** SQL (`infra/migrations`) |
| Laravel Sanctum (session/CSRF) | httpOnly cookie + JWT access/refresh (`internal/platform/auth`) |
| Spatie Laravel Permission | policy funcs / **casbin** (`internal/platform/authz`) |
| FormRequest validation | `go-playground/validator` + DTO binding |
| Laravel Horizon (queues) | **asynq** (Redis) worker fleet |
| Laravel scheduler (`schedule:run`) | asynq periodic tasks / `cmd/scheduler` |
| Laravel Echo broadcasting | Go WebSocket hub + channel tokens |
| Laravel Policies | `authz` middleware (`RequireRole`, `RequireFeature`) |
| Laravel Cashier | custom `billing` module + **Pesapal** (M-Pesa/card/bank) |
| Daraja STK direct integration | **not used** — Pesapal aggregates M-Pesa + bank |
| Artisan commands | `cmd/*` binaries (migrate, seed, worker, scheduler) |
| PHPStan/Pint | `golangci-lint` + `gofumpt` |
| Pest tests | Go `testing` + `testify` + `testcontainers-go` |

## Supabase-specific

| Supabase feature | Go replacement |
|------------------|----------------|
| GoTrue auth, JWT in localStorage | Go auth module, httpOnly cookie session |
| PostgREST auto REST | hand-written Fiber handlers per module |
| Row Level Security (RLS) policies | `ResolveOrganization` middleware **+** GORM `OrgScope` (two layers) |
| `db.from("table").select()` (client) | `apiClient.GET("/...")` typed over OpenAPI |
| Edge Functions (Deno) | asynq jobs + webhook controllers |
| Supabase Realtime | Go WS hub |
| Supabase Storage | MinIO (dev/test/CI) + R2/S3 (prod), signed upload URLs |
| Postgres RPCs (`is_management`, etc.) | service-layer Go funcs (see `04`) |
| `@lovable.dev/*`, Lovable AI gateway | removed; first-party OpenAI/Gemini |

## RPC mapping detail

| RPC | Go |
|-----|----|
| `get_user_organization_id(uuid)` | `tenancy.ResolveOrganization` |
| `user_org_match(uuid)` | `tenancy.UserBelongsToOrg` |
| `has_role(uuid, app_role)` | `authz.HasRole` |
| `is_staff(uuid)` / `is_management(uuid)` | `authz.IsStaff` / `authz.IsManagement` |
| `get_user_plan(uuid)` | `billing.PlanForOrg` |
| `get_user_business_type(uuid)` | `tenancy.BusinessTypeForOrg` |
| `check_staff_availability(...)` | `booking.Service.CheckAvailability` |
| `handle_new_user()` trigger | signup transaction in `auth` module |

## Frontend domain logic → shared contracts

| Prototype location | New home |
|--------------------|----------|
| `MODE_TERMS` (`useBusinessCategory.tsx`) | `packages/contracts/domain/mode-terms.json` |
| `BARBER_NAV`…`PRODUCTS_NAV` (`AppLayout.tsx`) | `packages/contracts/domain/nav/*.json` (manifest by `{mode,role}`) |
| `FEATURE_MIN_PLAN` / `FEATURE_PLAN_MAP` | `packages/contracts/domain/features.json` (single source) |
| `BASE_MONTHLY_KES`, `getPrice`, cycles | `packages/contracts/domain/pricing.json` + helpers |
| `lib/db.ts` wrapper | `apps/web/lib/api-client.ts` (typed) |
| CSS tokens + theme classes (`index.css`) | ported to `apps/web` (`10-design-system-tokens.md`) |

## Confirmed integration choices

| Concern | Choice |
|---------|--------|
| Payment gateway | **Pesapal** (M-Pesa + card + bank); no direct Daraja |
| Money model | **Platform collects**, ledger credits tenant, disburse via **Pesapal OpenFloat** |
| Object storage | **MinIO** (dev/test/CI), R2/S3 (prod) |
| SMS | **Africa's Talking** |
| WhatsApp | **Meta WhatsApp Cloud API** |
| Maps | **Google Maps** (mobile coverage zones, routing) |
| Tenant addressing | **Subdomain** `{slug}.hausofwellness.com` |
| Hosting | **VPS + Docker Compose** (MVP), k8s later |

## Known gaps to fix during port

1. Add `solo_pro` + `products` to `business_type` enum, and `solo_pro` to `subscription_plan` enum.
2. Add the missing `theme-products` CSS block.
3. Build real `solo_pro` / merged multi-mode nav manifests (prototype falls back to barber).
4. Single feature→plan map (kill the duplicate).
5. Add `organization_id` to `branches`.
6. Create `transactions` table up front.
7. Add ledger/wallet/payout tables (marketplace money model — not in prototype).
