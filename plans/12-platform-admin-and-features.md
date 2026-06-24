# 12 — Platform Admin Console & Feature System

Two linked systems: a **platform admin console** to run the whole SaaS, and a **feature registry** so every capability is a flag that can be added/removed without breaking anything. See `feature-flags.mdc` for the enforced rules.

---

## A. Feature system

### Two layers, one registry

| Layer | What | Where |
|-------|------|-------|
| **Plan entitlement** | feature → minimum plan | `features.json` `minPlan` + `subscriptions.plan` |
| **Operational flag** | per-org override, global kill-switch, % rollout | `organization_features`, `feature_flags` |

Both resolve through the **same registry** into a single effective `features[]` on `GET /me`. The client only reads it; the server decides (precedence + dependency rules in `feature-flags.mdc`).

### Data model

- **`features`** — catalog: `key` (PK), `label`, `description`, `category`, `min_plan`, `default_enabled`, `depends_on text[]`, `status`. Seeded/synced from `features.json`.
- **`organization_features`** — `organization_id`, `feature_key`, `enabled` (override), `note`, `set_by`, `set_at`. Unique `(organization_id, feature_key)`.
- **`feature_flags`** — `feature_key`, `global_enabled` (kill-switch), `rollout_percent`, `audience` (jsonc), `updated_by`, `updated_at`.

### Resolution service (Go)

`billing/feature` (or dedicated `features` module) exposes `EffectiveFeatures(ctx, orgID) []string`:

1. kill-switch off → drop. 2. per-org override → use it. 3. plan rank ≥ `min_plan` → on. 4. else `default_enabled`. 5. drop any feature whose `depends_on` is off. Cache per org in Redis (short TTL); invalidate on plan/override change → forces `/me` refetch.

### Wiring features into UI & routes

- **Nav manifest** items carry `requiredFeature?`; the sidebar renders only entitled items.
- **Routes** wrap pages in `<Feature>` / `RequireFeature`.
- **New section = add a registry entry + a manifest item** keyed to it. Defaults off → ships dark → enable per plan/org when ready. This is how we "break future sections into features."

---

## B. Platform Admin Console

A separate operator surface for the **platform team** (us), distinct from any tenant. Runs the business of the SaaS.

### Identity & access

- New non-tenant role **`platform_admin`** (and `platform_support`, read-mostly), stored outside the tenant `app_role` enum (e.g. `platform_users` table). **Never** a tenant role.
- Lives at **`admin.hausofwellness.com`** — Next.js `(admin)` route group with a hard server guard requiring `platform_admin`; reserved subdomain, not a tenant slug.
- All admin actions are **audited** (append-only `platform_audit_log`) and **2FA-required**.
- **Tenant impersonation** (support) is explicit, time-boxed, audited, and read-only by default — never silent.

### Modules

| Module | Capabilities |
|--------|--------------|
| **Dashboard** | platform KPIs: tenants, MRR, active subscriptions, payment volume, payout backlog, system health |
| **Tenants / orgs** | list, search, view, suspend/reactivate, set per-org feature overrides, impersonate (audited) |
| **Subscriptions & plans** | view/change plan, trials, dunning state, manual adjustments, refunds policy |
| **Feature management** | the registry UI — toggle global kill-switch, set `rollout_percent`, per-org overrides, mark beta/deprecated, view dependents |
| **Payments & ledger** | Pesapal transactions oversight, **payout queue + OpenFloat disbursement controls**, ledger explorer, reconciliation reports |
| **Compliance / KYC** | tenant verification status, AML flags, hold periods |
| **Audit log** | platform-wide append-only activity |
| **System** | health (`/health`, queue depth, error rate), announcements/banners, maintenance mode, global config |
| **Support** | tickets, impersonation sessions |

### Feature management UI (the core of the ask)

- Lists every registry feature with: status, plan, global flag, rollout %, # orgs overriding, dependents.
- Toggle a global kill-switch (instant disable across all tenants — graceful: sections vanish, no crash).
- Per-org override grid: enable a beta feature for one tenant, or disable a buggy one.
- Editing here writes `feature_flags`/`organization_features` → invalidates Redis → tenants' `/me` reflects change on next refetch. No deploy needed.

### Backend

`modules/platform/` (separate from tenant modules): `admin auth`, `tenants`, `plans`, `features` (registry CRUD + flags), `payouts oversight`, `audit`, `system`. All routes under `/api/v1/platform/*`, guarded by `RequirePlatformRole`. Tenant `OrgScope` does **not** apply here — admin reads across orgs, so these queries are explicitly cross-tenant and access-logged.

### Security notes

- Admin API is a distinct route group with its own auth context; a tenant token can never reach `/platform/*`.
- Cross-tenant reads are deliberate and audited; never reuse a tenant handler for admin.
- Disbursement controls (OpenFloat) require `platform_admin` + 2FA + audit + idempotency.

---

## Integration into the build

- **Phase 1:** stand up the registry (`features` table synced from `features.json`), `EffectiveFeatures`, `RequireFeature`, `<Feature>` guard. Everything gated from day one.
- **Phase 3+:** payout oversight enters the admin console alongside ledger/payouts.
- **Phase 5:** full admin console modules + feature-management UI + per-org overrides + rollouts.
- Admin console itself ships behind the platform guard; tenants never see it.
