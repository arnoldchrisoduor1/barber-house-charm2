# 05 — Auth, RBAC & Tenancy

The prototype leaned on Supabase (GoTrue auth + Postgres RLS). We rebuild all of it in Go.

## Authentication

| Concern | Choice |
|---------|--------|
| Browser ↔ API | **httpOnly cookie** session (same-site) carrying a short-lived access token + rotating refresh token. JWT in-memory for PWA/mobile later. |
| Password hashing | **argon2id** (`golang.org/x/crypto/argon2`) |
| Access token | JWT (HS256 or EdDSA), 15 min TTL, claims: `sub`, `active_org`, `roles[]` |
| Refresh token | opaque, stored hashed in Redis + DB, rotated on use, revocable |
| 2FA | **TOTP** (`pquerna/otp`) + hashed recovery codes; optional later |
| OAuth | Google (later) via `golang.org/x/oauth2` |

### Endpoints

```
POST /api/v1/auth/register          # user + org bootstrap (tx)
POST /api/v1/auth/login             # -> 200 session OR 422 partial (2FA required)
POST /api/v1/auth/2fa/verify        # complete step-up
POST /api/v1/auth/refresh           # rotate
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/me                     # user, roles, active_org, subscription, features[]
```

### Signup bootstrap (replaces `handle_new_user()` trigger)

In one DB transaction: create `user` → `profile` → `user_roles(customer)` → `organization` → `organization_members` → `subscriptions(trial, 7d)`. Emit `UserRegistered` event.

## Authorization (RBAC)

Roles from `user_roles` (a user may hold several). Helpers mirror the prototype:

```go
func HighestRole(roles []string) string // ceo > director > branch_manager > senior > junior > receptionist > customer
func IsManagement(roles []string) bool   // ceo|director|branch_manager
func IsStaff(roles []string) bool        // any non-customer
```

- Middleware `RequireRole(...)` and `RequireFeature(...)` gate route groups.
- **Engine:** start with explicit policy functions; adopt **casbin** if the matrix (the docs' 8.2 module access matrix) grows unwieldy. Either way the matrix is data, derived from `packages/contracts/domain`.
- **Executive portal preview** (`staff_portal_view`) is a **UI-only** convenience. The server always authorizes against real roles — never the simulated one.

## Platform admin role (non-tenant)

Separate from tenant `app_role`: **`platform_admin`** / `platform_support` live in a `platform_users` table and authenticate into the admin console (`admin.hausofwellness.com`, `/api/v1/platform/*`). A tenant token can never reach platform routes, and platform identities are not org-scoped (their queries are deliberately cross-tenant + audited). Require 2FA. See `12-platform-admin-and-features.md`.

## Feature gating (entitlement)

`GET /me` returns `features: string[]` computed from the org's plan via `hasFeature(plan, key)` (see `06-billing-and-features.md`). The client gates UX; **every mutation route re-checks** with `RequireFeature`. Management bypass, if kept, is nav-only — protected mutations still enforce the plan.

## Tenant isolation (the #1 risk)

Supabase RLS enforced `organization_id = get_user_organization_id(auth.uid())` at the DB. In Go we replace this with **two independent layers**:

1. **`ResolveOrganization` middleware** — derives `organization_id` from the authenticated user's membership (and validates the `{org}` path param belongs to that user). **Never** read org from the request body for privileged routes.
2. **GORM `OrgScope`** — every tenant-table query filters by the resolved org id (see `04-data-postgres-gorm.md`).

```go
func ResolveOrganization() fiber.Handler {
  return func(c *fiber.Ctx) error {
    user := auth.UserFrom(c)
    org := c.Params("org")
    if !tenancy.UserBelongsToOrg(c.Context(), user.ID, org) {
      return httpx.Problem(c, 403, "not a member of organization")
    }
    c.Locals("org_id", org)
    return c.Next()
  }
}
```

### Subdomain tenant addressing

Tenants are addressed by **subdomain**: `{slug}.hausofwellness.com` (plus apex for marketing, `app.` or root for the staff shell during dev).

- Next.js `middleware.ts` reads the host, extracts `slug`, passes `x-tenant-slug` to the app. This is a **hint only** — the API re-validates that the authenticated user belongs to the org for that slug; never authorize from the header alone.
- **Cookie scope:** set the session cookie on the parent domain (`Domain=.hausofwellness.com`) so it works across tenant subdomains; `Secure`, `HttpOnly`, `SameSite=Lax`. Guard against subdomain cookie-leak by still binding the session to `active_org` and re-checking membership.
- Reserved subdomains (`www`, `app`, `api`, `admin`) are not tenant slugs.
- Local dev: use `*.lvh.me` or `/etc/hosts` entries to emulate subdomains.

### Public booking exception

`/book/[orgSlug]` is unauthenticated. Scope it via a **signed org token** (JWT with `org_id`, `exp`, `nonce`) or slug + Turnstile + rate limit, then scope all queries to that org only. Never accept a raw `organization_id` from the public widget body.

## Security baseline

- TLS everywhere; HSTS; secrets in a manager, never git; quarterly rotation.
- Rate limit `auth/login`, `auth/2fa/verify`, `mpesa/stk` per IP + per user + per org (Redis).
- Append-only `audit_log`; mask phone/PII in non-security logs.
- `gosec` + `govulncheck` + Semgrep in CI.
