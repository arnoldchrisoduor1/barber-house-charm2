# Haus of Wellness — Build Plans

This folder is the **authoritative build plan** for re-implementing the **Haus of Grooming OS** platform (brand surface: **Haus of Wellness**) as a production system.

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — port of the existing Vite prototype at `../../barber-house-charm`.
- **Backend:** **Go + Fiber + GORM** (replacing the docs' Laravel/PHP target and the prototype's Supabase backend).
- **Database:** PostgreSQL 16 + Redis 7.
- **Scope:** Full **9-mode** multi-tenant SaaS from day one (not wellness-only), monorepo.

## Source material

| Source | What it gives us |
|--------|------------------|
| `../docs/public/docs-sources/*.md` | Product surface, schema, routes, RBAC, billing (Laravel-target) |
| `../../barber-house-charm` (Vite prototype) | Real UI, 154 routes, design tokens, nav/terms/pricing logic, Supabase schema (`types.ts`) |

The prototype is the **ground truth for UI + domain shapes**. The docs are the ground truth for **product rules**. Where they conflict, prefer the prototype's code, then reconcile in `08-laravel-supabase-to-go-mapping.md`.

## Read order

1. [`00-scope-and-product.md`](./00-scope-and-product.md) — what we build, the 9 modes, brand naming
2. [`01-monorepo-architecture.md`](./01-monorepo-architecture.md) — repo layout + tooling
3. [`02-frontend-nextjs.md`](./02-frontend-nextjs.md) — Next.js port strategy
4. [`03-backend-go-fiber.md`](./03-backend-go-fiber.md) — Go/Fiber modular monolith
5. [`04-data-postgres-gorm.md`](./04-data-postgres-gorm.md) — schema, GORM models, migrations
6. [`05-auth-rbac-tenancy.md`](./05-auth-rbac-tenancy.md) — auth, 2FA, roles, tenant isolation
7. [`06-billing-and-features.md`](./06-billing-and-features.md) — plans, feature gates, pricing, M-Pesa
8. [`07-realtime-jobs-integrations.md`](./07-realtime-jobs-integrations.md) — websockets, queues, integrations
9. [`08-laravel-supabase-to-go-mapping.md`](./08-laravel-supabase-to-go-mapping.md) — translation table
10. [`09-phased-roadmap.md`](./09-phased-roadmap.md) — phases + Definition of Done
11. [`10-design-system-tokens.md`](./10-design-system-tokens.md) — full design token spec
12. [`11-master-build-plan.md`](./11-master-build-plan.md) — **combined end-to-end phased plan (start here for execution)**
13. [`12-platform-admin-and-features.md`](./12-platform-admin-and-features.md) — platform admin console + feature registry/flags

## Hard rules (also enforced in `.cursor/rules/`)

1. **Tenant isolation is sacred.** Every tenant table carries `organization_id`. Never trust it from the request body for privileged routes; resolve from authenticated membership. Enforce with a GORM scope on every query.
2. **No business rules in the client.** Money, inventory deductions, booking-conflict checks, and feature entitlement are decided by Go. The frontend only reflects server truth.
3. **Contracts first.** Nav configs, mode terms, feature→plan maps, and pricing live in `packages/contracts` and are shared by both apps. No hardcoded duplicates.
4. **Design fidelity.** Reuse the prototype's HSL token system and per-mode theme classes verbatim. See `10-design-system-tokens.md`.
