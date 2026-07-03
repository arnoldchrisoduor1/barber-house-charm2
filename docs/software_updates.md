# Portal implementation status — Haus of Wellness

**Design reference:** Vite prototype at `../barber-house-charm`  
**Current build:** `apps/web` + `packages/contracts/domain/nav/barber.json`  
**Last updated:** 2026-07-01 — Full portal completion + polish pass

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Full UI** | Working page connected to Go API; matches prototype intent |
| **Partial UI** | Core flows work; some prototype polish not yet ported |
| **CRUD** | Generic table + form (functional, less visual than prototype) |
| **Prototype-only** | Exists in Vite demo as mock; not in barber nav / out of MVP scope |

---

## Cross-portal state sync

| Mechanism | Details |
|-----------|---------|
| **React Query** | Shared keys `["org", orgId, resource]`; mutations invalidate prefix |
| **WebSocket** | `POST /realtime/token` → `wss://…/organizations/:org/ws?token=` |
| **Events** | `booking.created`, `queue.updated`, `payment.completed`, `chat.message` |
| **Hook** | `useOrgRealtime()` in dashboard + portal layouts |
| **Stores** | Zustand: branch filter, portal tab, portal customer phone, UI theme |

**Verified flow:** Client books → appears in staff bookings/POS/queue → executive dashboard metrics update via WS invalidation.

---

## Backend API surface (operational)

| Module | Key routes |
|--------|------------|
| Analytics | `/analytics/reports`, `/revenue-chart`, `/payment-methods`, `/top-services`, `/staff-leaderboard`, `/dashboard-extras`, `/scorecards`, `/my-earnings` |
| Bookings | CRUD + `?date=&staff_id=&status=`, `PATCH /:id/status`, portal create, waitlist |
| Finance | `/ledger/*`, `/finance/expenses`, `/payouts` |
| Payroll | `/commissions/rules`, `/commissions/summary`, `/payroll/payslips` |
| POS | `/transactions/checkout`, `/tips`, `/pos/shifts/open\|close\|active` |
| QR | `/qr/clock`, `/qr/scans`, `/qr/attendance`, `/qr/branch-token/:branch_id` |
| Portal | `/loyalty/wallet`, `/loyalty/rewards`, `/loyalty/redeem`, `/referrals/my`, `/reviews/my` |
| Tenancy | `/branches` GET/POST/PUT |
| Auth | `/me` (includes `staffId`), `/auth/change-password` |
| Realtime | Staff chat publishes `chat.message` on send |

**Migration:** Run `000008_portal_features` before using new tables.

---

# BUSINESS OWNER PORTAL

## Executive

| Path | Status | Notes |
|------|--------|-------|
| `/dashboard` | **Full UI** | 8 stat tiles, monthly target bar, RevenueChart, PaymentMethodsChart, TopServicesChart, StaffLeaderboard, AiInsightsWidget, recent reviews feed; staff scope shows personal stats + schedule |
| `/branches` | **Full UI** | Card grid, staff count, create + edit dialog, PUT `/branches/:id` |
| `/reports` | **Full UI** | KPI tiles, charts, CSV-style data display |
| `/finance` | **Full UI** | Tabs: Overview, Expenses, Transactions, Payouts; expense CRUD |
| `/commissions` | **Full UI** | Period filter, rules table, commission summary |
| `/payroll` | **Full UI** | Payslip table, generate payslips |
| `/audit-log` | **Full UI** | Search filter, color-coded action badges |
| `/qr-attendance` | **Full UI** | Branch QR, scan log, attendance grid |
| `/scorecards` | **Full UI** | Ranked scorecards with progress bars |
| `/call-centre` | **Partial UI** | Stats + DialPad; full omnichannel inbox is prototype mock |
| `/revenue-forecast` | **Full UI** | Forecast charts + insight cards |
| `/field-operations` | **Partial UI** | Tabbed dispatch/routes/zones panels; live map is prototype mock |

## Services

| Path | Status | Notes |
|------|--------|-------|
| `/services` | **Full UI** | Card grid, category filters, CRUD dialog |
| `/staff` | **Full UI** | Directory cards, role/commission/specialties, CRUD |
| `/clients` | **Full UI** | Search, loyalty tier badges, visit/spend stats |
| `/client-ownership` | **Full UI** | Search, tier filter, staff name resolution |

## Sales

| Path | Status | Notes |
|------|--------|-------|
| `/pos` | **Full UI** | Shift gate, held sales, receipt, Services/Products/Packages tabs, manager PIN discount, booking bill |
| `/payments-demo` | **Full UI** | Pesapal demo checkout |

## Growth

| Path | Status | Notes |
|------|--------|-------|
| `/marketing` | **Full UI** | Campaign overview cards + full CRUD table |

## Operations

| Path | Status | Notes |
|------|--------|-------|
| `/tips` | **Full UI** | Tips CRUD, status filter, summary stats |
| `/retail-products` | **Full UI** | Search, category filter, product card grid |
| `/revenue-forecast` | *(see Executive)* | |
| `/field-operations` | *(see Executive)* | |
| `/staff-chat` | **Full UI** | Multi-channel sidebar, WS realtime on new messages |
| `/bookings` | **Full UI** | Date picker, cards, create dialog, status workflow, staff filter |
| `/schedule` | **Full UI** | Week grid calendar |
| `/waitlist` | **Full UI** | Live cards, add form, status actions |
| `/queue` | **Full UI** | Kanban board, token-based WS refresh |

## System

| Path | Status | Notes |
|------|--------|-------|
| `/branding` | **Partial UI** | Primary/secondary/accent pickers + live preview; logo upload uses URL field |
| `/seat-rental` | **Full UI** | Occupancy stat tiles + rental table CRUD |
| `/notifications` | **Full UI** | Inbox tabs, mark read, mark all read |
| `/settings` | **Full UI** | Profile, password change, 2FA, theme, notification prefs |
| `/support` | **Full UI** | FAQ + contact cards + enquiry form |

---

# STAFF PORTAL

Staff roles share routes filtered by `useStaffScope` / `useCurrentStaffId` / portal preview.

| Path | Role(s) | Status | Notes |
|------|---------|--------|-------|
| `/dashboard` | All staff | **Full UI** | Personal stat tiles + today's schedule |
| `/bookings` | Manager, reception, barber | **Full UI** | Staff-scoped when barber |
| `/schedule` | Manager, reception, barber | **Full UI** | Week grid; self-filtered for barbers |
| `/queue` | Manager, reception | **Full UI** | Kanban board |
| `/waitlist` | Manager | **Full UI** | Live waitlist |
| `/qr-clock` | Reception, barber | **Full UI** | Branch QR + clock in/out |
| `/qr-attendance` | Manager | **Full UI** | Manager attendance view |
| `/reviews` | Barber | **Full UI** | Star ratings, staff-scoped filter |
| `/my-earnings` | Barber | **Full UI** | Auto-bound to `me.staffId`, summary cards |
| `/clients` | Barber | **Full UI** | Staff-scoped client list |
| `/pos` | Reception | **Full UI** | Full POS workspace |
| `/staff-chat` | All | **Full UI** | Multi-channel + realtime |

---

# CLIENT PORTAL

Nav: `CLIENT_PORTAL_NAV` in `lib/portal-view.ts`

| Path | Status | Notes |
|------|--------|-------|
| `/portal` | **Full UI** | Greeting, next booking, branches, featured services, staff carousel, loyalty strip |
| `/portal/book` | **Full UI** | BookingWizard (branch → services → datetime → staff → confirm) |
| `/portal/bookings` | **Full UI** | Upcoming/past tabs, rich cards, link to reschedule |
| `/portal/loyalty` | **Full UI** | Points wallet, tier progress, rewards redeem |
| `/portal/reviews` | **Full UI** | Submit + list reviews |
| `/portal/referrals` | **Full UI** | Referral code, history, stats |
| `/portal/profile` | **Full UI** | Edit name/phone, save to CRM |
| `/portal/reschedule` | **Full UI** | Cancel/reschedule upcoming bookings |
| `/portal/wallet` | **Partial UI** | Loyalty credits + demo M-PESA top-up (localStorage) |
| `/portal/notifications` | **Partial UI** | Preference toggles (localStorage); no push service yet |

---

# E2E test coverage

| Spec | Covers |
|------|--------|
| `dashboard-flows.spec.ts` | Executive dashboard metrics + charts |
| `analytics-flows.spec.ts` | Reports, scorecards, forecast, call-centre, field-ops, my-earnings |
| `operations-flows.spec.ts` | Bookings, schedule, queue, waitlist |
| `finance-flows.spec.ts` | Finance, commissions, payroll, tips |
| `pos-flows.spec.ts` | POS checkout, shift, receipt |
| `staff-portal-flows.spec.ts` | Staff-scoped views, QR clock |
| `client-portal-flows.spec.ts` | Portal home, book, bookings, loyalty |
| `cross-portal-flow.spec.ts` | Client book → staff POS → dashboard revenue |
| `booking-flows.spec.ts` | Public + portal booking |
| `api.spec.ts` | Analytics, bookings, branch filter |
| `gating.spec.ts` | Feature flag enforcement |

Run: `cd apps/web && PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e`

---

# Remaining prototype-only items (not in barber MVP nav)

These exist in the Vite prototype as mock/localStorage pages and are **not** required for barber mode MVP:

- Drag-reschedule calendar, OCR expenses, telehealth, SOAP notes mock UIs
- Live GPS map tracking (field ops uses tabbed panels instead)
- Full omnichannel call-centre (SMS/WhatsApp agent workspace)
- Shop storefront (`/shop/*`) — separate retail mode
- Digital wallet with Apple Pay / Google Pay (portal wallet uses loyalty credits + demo M-PESA)
- Push notification service (portal prefs stored locally until FCM/APNs integration)
- Review reply persistence on staff reviews (reply field in UI; backend model pending)
- Logo file upload to object storage (branding uses URL + color pickers)

---

# Summary counts (barber mode)

| Status | Count (approx.) |
|--------|-----------------|
| **Full UI** | 45+ routes across all portals |
| **Partial UI** | 5 (call-centre depth, field-ops map, branding upload, portal wallet, portal notifications) |
| **CRUD** | 0 primary nav items (all upgraded) |
| **Prototype-only** | 90+ mock pages in Vite demo not in barber nav |

---

# Local run checklist

```bash
# 1. Migrate
docker compose -f infra/docker/compose.yml run --rm migrate

# 2. Build & start
docker compose -f infra/docker/compose.yml build api web
docker compose -f infra/docker/compose.yml up -d

# 3. E2E
cd apps/web
PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_API_URL=http://localhost:18432 npm run test:e2e
```

**Demo CEO:** `arnoldchris262@gmail.com` / `Admin123!`
