# 02 — Frontend (Next.js)

Port the Vite prototype (`../../barber-house-charm`) to Next.js App Router. Keep the design system and domain logic; swap router + data layer.

## App Router structure

```text
apps/web/
  app/
    (marketing)/            # / , /discover , /platforms , /barbers/[id]   (RSC + ISR, SEO)
    (public)/
      book/[orgSlug]/       # public booking widget (minimal JS, Turnstile)
      shop/                 # storefront: home, category, product, brand, bundles, checkout, success, wishlist
    (auth)/                 # /auth (login/signup), /get-started, /reset-password
    onboarding/             # post-login, no shell
    select-plan/            # post-login, no shell
    (portal)/               # customer portal layout — /portal/* (9 routes)
    (dashboard)/            # staff shell — mode-aware sidebar (≈125 routes)
  components/
    layout/                 # AppShell (was AppLayout), CustomerShell, ShopShell
    modes/                  # mode-specific widgets (dispatch, products dashboard, clinical)
    ui/                     # shadcn primitives (port 48 from prototype)
    dashboard/              # RevenueChart, TopServicesChart, PaymentMethodsChart, StaffLeaderboard
  hooks/                    # useAuth, useSubscription, useUserRole, useBusinessCategory, ...
  lib/
    api-client.ts           # typed fetch wrapper over packages/contracts/ts (replaces lib/db.ts)
    query-keys.ts           # ['org', orgId, entity, params]
  middleware.ts             # session refresh, request id, subdomain -> x-tenant-slug hint
```

## Route-wrapper → layout mapping

The prototype's wrappers map to Next layouts/guards:

| Prototype | Next.js equivalent |
|-----------|--------------------|
| `ProtectedRoute` | server check in `(dashboard)/layout.tsx` + `(portal)/layout.tsx` (verify session via `GET /me`) |
| `PublicRoute` | redirect logged-in users from `(auth)` group |
| `P` (Protected+AppLayout) | `(dashboard)` group + `AppShell` |
| `PG` (Protected+AppLayout+FeatureGate) | `(dashboard)` + `<FeatureGate feature>` client wrapper around the page |
| `CP` | `(portal)` group + `CustomerShell` |
| `SmartRedirect` (`/home`) | a route handler that 302s by highest role |

## Server vs client boundaries

- **Server Components** for read-mostly aggregation pages (dashboards prefetch multiple API calls in parallel on the server).
- **Client Components** for: calendars, drag-drop schedule, POS keypad, QR scanner, chat, maps (coverage zones), command palette (⌘K), any `framer-motion` animation.
- **No Server Actions that re-implement business rules.** If used at all, a Server Action is a thin BFF proxy to Go with Zod validation — Go remains the single source of truth.

## Data layer (replaces Supabase)

The prototype used `db.from("table").select().eq(...)` + TanStack Query + `useOrganizationId()`. Replace with:

```ts
// lib/api-client.ts — typed over packages/contracts/ts
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

export function useBookings(filters: BookingFilters) {
  const orgId = useOrganizationId();
  return useQuery({
    queryKey: ["org", orgId, "bookings", filters],
    queryFn: () => apiClient.GET("/organizations/{org}/bookings", {
      params: { path: { org: orgId }, query: filters },
    }),
  });
}
```

- Keep TanStack Query, query-key shape, stale-time policy from the prototype/docs.
- Org id resolves from `GET /me` (returns `active_org`, `roles`, `subscription`, `features[]`), cached short (30–60s).
- Realtime: subscribe to the Go WebSocket hub for queue/chat/notifications; `setQueryData` patch or targeted invalidate.

## Make it "more variable & broken down" (the explicit ask)

The prototype has ~136 fat page files and hardcoded nav arrays in `AppLayout.tsx`. In the rewrite:

1. **Nav, terms, features, pricing come from `packages/contracts/domain/*.json`** — not inline `BARBER_NAV` consts. The sidebar renders from a manifest filtered by `{mode, role, features}`.
2. **Pages are thin.** Each route page composes feature components from `components/<feature>/`. Page file = data fetching + layout; logic lives in components/hooks.
3. **Build a real `<DataTable>` abstraction** (columns/data/pagination/sort/filter) — the prototype repeats `ui/table.tsx` across 20+ pages. One component, configured per page.
4. **Multi-mode nav is merged**, not "fall back to barber". Manifest keyed by `{mode, role}`; multiple modes → union of items, deduped by `section:path`.
5. **`solo_pro` and `products`** get real manifests (prototype lacks a `SOLO_PRO_NAV`).

## Design system

Port `src/index.css` token blocks and `tailwind.config.ts` verbatim; per-mode theme class toggled on `<html>` by `useBusinessCategory`. Full spec in `10-design-system-tokens.md`. Add the missing `theme-products` block.

## Testing

- Vitest + Testing Library for hooks/components (port the prototype's `src/test` setup).
- Playwright smoke for: login, role redirect, booking create, POS sale, feature-gate upgrade prompt, portal isolation.
