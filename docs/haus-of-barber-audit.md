# Haus of Barber — Full Module Audit & Recommendations

**Scope:** Mode `barber` in charm2 (`barber-house-charm2`) vs Vite prototype (`barber-house-charm`).  
**Date:** 2026-08-03  
**Intent:** Exhaustive inventory of every relevant flow (expenses, bookings, CRM, marketing, HR, payroll, attendance, etc.), status in both systems, gaps, and how to fold each into production Go + Next without cargo-culting prototype mocks.  
**Related:** [prototype-vs-charm2-gaps.md](./prototype-vs-charm2-gaps.md) (deploy blockers). This doc is **barber-mode deep dive** + adoption strategy.

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Is Haus of Barber pilot-ready for daily shop ops? | **Yes, conditionally** — bookings, queue, clients, staff invite, schedule read, POS UI, finance/expenses, QR attendance work enough for a pilot after env + bug/gate cleanup. |
| Does charm2 match prototype surface? | **Nav is thinner than beauty, closer to prototype BARBER_NAV.** Shared growth/inventory pages already exist in charm2 but are **missing from** [`barber.json`](../packages/contracts/domain/nav/barber.json). Prototype also has ~55 **localStorage gap UIs** (command palette) that are **not production models**. |
| Biggest lie-to-user risks | Live Pesapal/OpenFloat/SMS/WhatsApp stubs; scorecard punctuality/retention hardcoded; call centre telephony fake; field ops on barber nav; payments-demo in nav; seat-rental feature-gate triple mismatch. |
| How to adopt prototype modules | **Three lanes:** (A) surface existing charm2 pages in barber nav + fix gates; (B) harden partial real modules (HR cycle, reports, chair rental, ownership); (C) promote selected prototype gap UIs into real schemas only when daily ops demand them — never port `localStore` as data plane. |

---

## Sources of truth

| Layer | Path |
|-------|------|
| Barber nav (charm2) | `packages/contracts/domain/nav/barber.json` |
| Mode terms / brand | `packages/contracts/domain/mode-terms.json` → `Haus of Barber` |
| Feature registry | `packages/contracts/domain/features.json` |
| Prototype sidebar | `../barber-house-charm/src/components/AppLayout.tsx` → `BARBER_NAV` |
| Prototype gap registry | `../barber-house-charm/src/lib/commandRoutes.ts` + `localStore.ts` |
| Deploy gaps (cross-mode) | `docs/prototype-vs-charm2-gaps.md` |

**Principle:** Client never computes entitlement. Unknown feature key = disabled. Adding capability = registry entry + nav item + `RequireFeature` + service check.

---

## Status legend

| Tag | Meaning |
|-----|---------|
| **Real** | Org-scoped Go API + FE wired; usable with empty-ish DB |
| **Partial** | API/FE exist but UX, metrics, mutations, or integrations incomplete |
| **Stub** | UI theatre, hardcoded data, or integration returns fake success |
| **Orphan** | Page/API exists in charm2 but not linked in `barber.json` |
| **Gap-UI** | Prototype-only localStorage/command-palette screen — no first-class backend |
| **N/A-barber** | Clinic/therapy/mobile/products — do not copy into barber IA |

---

## 1. Information architecture — nav parity

### 1.1 charm2 `barber.json` (current)

**Sections:** Executive · Branch · Reception · My Chair · Services · Sales · Growth · Operations · System

**Unique paths:** `/dashboard`, `/branches`, `/reports`, `/finance`, `/commissions`, `/payroll`, `/audit-log`, `/qr-attendance`, `/scorecards`, `/call-centre`, `/schedule`, `/staff`, `/bookings`, `/waitlist`, `/queue`, `/clients`, `/qr-clock`, `/pos`, `/payments-demo`, `/reviews`, `/my-earnings`, `/services`, `/client-ownership`, `/marketing`, `/tips`, `/retail-products`, `/revenue-forecast`, `/field-operations`, `/staff-chat`, `/branding`, `/seat-rental`, `/notifications`, `/settings`, `/support`

### 1.2 Prototype `BARBER_NAV` vs beauty — under-surfaced in both prototypes and charm2 barber

Prototype **beauty** sidebar includes Growth + inventory items that **barber sidebar omits** (routes still exist via command palette / direct URL). Charm2 **beauty.json** already lists these; **barber.json does not**:

| Path | Charm2 beauty | Charm2 barber | Recommendation |
|------|---------------|---------------|----------------|
| `/loyalty` | Yes | **Orphan** | Add to Growth with `loyalty` |
| `/packages` | Yes | **Orphan** | Add to Growth with `marketing` |
| `/gift-cards` | Yes | **Orphan** | Add to Growth with `marketing` |
| `/promotions` | Yes | **Orphan** | Add with `promotions_referrals` |
| `/referrals` | Yes | **Orphan** | Add with `promotions_referrals` |
| `/gallery` | Yes | **Orphan** | Add as “Before & After Gallery”; storage upload later |
| `/whatsapp` | Yes | **Orphan** | Add after send is real; until then log-only is weak |
| `/inventory` | Yes | **Orphan** | Add for shops selling product + clipper consumables |
| `/consumption` | Yes | **Orphan** | Add with inventory (product → service use) |
| `/suppliers` | Yes | **Orphan** | Add with inventory |
| `/reconciliation` | Yes (placeholder) | Missing | Build API then add; do not surface stub |

### 1.3 Wrong-for-barber surfaces (remove or mode-gate)

| Path | Issue | Recommendation |
|------|-------|----------------|
| `/field-operations` | Mobile dispatch on barber ops nav | Remove from `barber.json` (keep for `mobile` mode) |
| `/payments-demo` | Explicit no-API theatre | Remove from prod nav / feature-flag off |

---

## 2. Module-by-module audit

Each row: what prototype had, what charm2 has, gap, **how to add/improve for daily barber use**.

### 2.1 Executive — Dashboard

| | |
|--|--|
| **Prototype** | Partial — bookings/tx/expenses/customers + demo fallback; chair utilization |
| **Charm2** | Partial — analytics API; `monthly_target_kes = 500000` hardcoded (`analytics/repository.go`); `chairUtil: 0` on dashboard |
| **Gap** | Targets not org-configurable; chair utilization meaningless |
| **Recommendation** | Org settings: monthly revenue target + chair count (or derive from active `seat_rentals` / stations). Compute chair util = occupied chair-minutes / open chair-minutes from bookings + schedule. Branch-scoped KPIs for managers. |

### 2.2 Branches

| | |
|--|--|
| **Prototype** | Partial CRUD + `multi_branch` gate |
| **Charm2** | Real CRUD under tenancy; **page** gated `multi_branch`, **nav/API** often ungated |
| **Gap** | Gate inconsistency; weak multi-branch E2E lifecycle |
| **Recommendation** | Align nav + API + page on `multi_branch`. Add branch create → hours → assign staff → open queue checklist for Haus of Barber multi-location chains. |

### 2.3 Reports & Analytics

| | |
|--|--|
| **Prototype** | Partial aggregates; **report builder** = localStorage Gap-UI |
| **Charm2** | Real basic aggregates (`basic_reports`); no custom builder |
| **Gap** | No barber-native views (by barber, by service category fade/beard/shave, by chair, by hour-of-day walk-ins vs appointments) |
| **Recommendation** | Phase reports intentionally: (1) fix aggregates correctness + date/branch filters; (2) **Barber performance report** (revenue, tickets, avg ticket, utilization, rebook rate); (3) **Service mix** using contracts barber categories; (4) optional saved report defs later — only if product proves need; skip porting fake builder. Export CSV/PDF for owner. |

### 2.4 Finance & Expenses

| | |
|--|--|
| **Prototype** | Expense CRUD on Supabase `expenses` + receipt upload; charts; P&amp;L/cash-flow/OCR/export = **mock Gap-UIs** |
| **Charm2** | **Real** expense model/API/UI under `/finance` (`ledger/expense_*.go`, finance page, E2E). Categories, description, amount, date, optional `receipt_url`. Payouts depend on OpenFloat stub. |
| **Gap** | No first-class P&amp;L page (can compute from tx − expenses); receipt upload may be URL-only (no MinIO/R2 picker); accounting export not built |
| **Recommendation** | Treat expenses as **done for pilot**. Next: (1) receipt file upload to object storage; (2) **P&amp;L tab** computed server-side from ledger + expenses (not hardcoded months); (3) branch filter; (4) petty-cash / daily float for reception; (5) CSV export for accountant; defer OCR + multi-currency until enterprise demand. |

### 2.5 Commissions

| | |
|--|--|
| **Prototype** | Client-side calc from `staff.commission_rate` × transactions; CSV |
| **Charm2** | Real `/commissions` + payroll module; gated `staff_commissions_payroll` |
| **Gap** | No immutable commission ledger per ticket; tip vs service commission split unclear for daily disputes |
| **Recommendation** | On completed sale: write **commission line** (staff_id, txn_id, base, rate, amount, tip_share). Period summary becomes sum of lines. Support dual model: commission employee vs **chair rental** (flat rent, keep ticket after rent — see seat-rental). Manager adjust + audit. |

### 2.6 Payroll & Payslips

| | |
|--|--|
| **Prototype** | Partial — commission + attendance days; no payslip entity |
| **Charm2** | Real rules + payslips API/UI; gated enterprise; no tax/NHIF/NSSF/export compliance |
| **Gap** | KE compliance; export for payroll bureau; chair-renter “payout” ≠ salary |
| **Recommendation** | Keep simple payslip = base + commission + tips − deductions for employees. Separate **contractor settlement** for chair renters. Add PDF/CSV export. Tax engines later behind feature `payroll_compliance` if needed. |

### 2.7 My Earnings (barber self-serve)

| | |
|--|--|
| **Prototype** | Real if `staff.user_id` linked |
| **Charm2** | Real API; **gated `advanced_analytics`** — too heavy for chair staff on starter/pro |
| **Gap** | Wrong feature for daily barber use |
| **Recommendation** | Gate on `staff_commissions_payroll` **or** a new starter `my_earnings` depending only on staff link. Show today/week: tickets, tips, projected commission. Deep link from POS complete. |

### 2.8 Audit Log

| | |
|--|--|
| **Prototype** | Partial `audit_log` + demo |
| **Charm2** | Real viewer; mutations may not always write events |
| **Gap** | Empty log erodes trust for HR/finance disputes |
| **Recommendation** | Mandatory audit on: booking create/cancel, payment, expense, staff invite/deactivate, commission adjust, payroll run, QR clock override. Append-only; never delete. |

### 2.9 QR Attendance (mgmt) & QR Clock (My Chair)

| | |
|--|--|
| **Prototype** | Partial scans + geo UI |
| **Charm2** | Real staff QR APIs + pages; **nav ungated** vs `qr_clock` |
| **Gap** | Gate mismatch; print/rotate QR workflows thin; no late/absent auto flags for scorecards |
| **Recommendation** | Nav `requiredFeature: qr_clock`. Branch QR poster + rotate secret. Attendance drives: payroll days worked, punctuality for scorecards, schedule exceptions. Manager exception with reason → audit. |

### 2.10 Barber Scorecards

| | |
|--|--|
| **Prototype** | **Mock** — `getDemoScorecards()` only |
| **Charm2** | Partial — revenue/bookings/rating real-ish; **punctuality 85% / retention 72% hardcoded** in SQL |
| **Gap** | Fake metrics worse than missing |
| **Recommendation** | Either compute or remove. **Compute:** punctuality = on-time clock-ins vs scheduled start; retention = clients rebooked within N days with that barber; utilization from bookings. Ranking board for Monday huddle. Period selector must change data. |

### 2.11 Haus Connect / Call Centre

| | |
|--|--|
| **Prototype** | Mock dial pad + demo logs |
| **Charm2** | Enquiry/stats partial; DialPad hardcoded contacts; **no telephony** |
| **Gap** | Softphone fantasy |
| **Recommendation** | Rebrand to **Enquiry desk**: inbound leads, missed-call log (manual), WhatsApp enquiry → booking conversion. Do not advertise phone. Later: click-to-call via telephony partner as separate feature. |

### 2.12 Schedule

| | |
|--|--|
| **Prototype** | Real `staff_schedules` CRUD |
| **Charm2** | API CRUD exists; FE largely **read-only week grid** (hours display improved to 0–23) |
| **Gap** | Managers cannot edit shifts in UI — blocks daily ops |
| **Recommendation** | First-class schedule editor: set hours, day off, copy week, conflict with bookings. Barber “My Schedule” read + request time-off (ties to HR). Default open hours from branch settings. |

### 2.13 Bookings

| | |
|--|--|
| **Prototype** | Real create/reschedule/status; advanced/buffer/deposits/cancel = Gap-UI |
| **Charm2** | Real booking module + FE; customer search improved; conflict depth still QA risk |
| **Gap** | Full wizard polish; deposits/no-show fees not first-class; buffer times |
| **Recommendation** | Harden core wizard (client search, multi-service, preferred barber, conflict check). Add **buffer minutes** on service model before “advanced recurring.” Deposits when Pesapal live. Recurring/group bookings only after core stable. Public `/book/[orgSlug]` already exists — keep barber default services from mode terms. |

### 2.14 Waitlist

| | |
|--|--|
| **Prototype** | Real waitlist table |
| **Charm2** | Real API; FE asks raw **customer UUID** (bad UX) |
| **Gap** | Reception cannot use quickly |
| **Recommendation** | Client picker (search name/phone). Preferred barber + service. Auto-notify when slot frees (SMS later). Convert waitlist → booking one click. |

### 2.15 Walk-in Queue (barber-critical)

| | |
|--|--|
| **Prototype** | Partial — derived from today’s bookings; some CTAs non-mutating |
| **Charm2** | Real derived queue + WebSocket; gated `queue` |
| **Gap** | Prod WS reliability; explicit walk-in create UX |
| **Recommendation** | One-tap “Add walk-in” (client + service + barber or next-available). Board: waiting / in-chair / done. Est. wait from average service duration × queue position. Optional SMS “you’re next.” This is **core Haus of Barber floor ops**. |

### 2.16 Clients / CRM

| | |
|--|--|
| **Prototype** | Real customers CRUD; merge/tags/photos/CLV/notes = Gap-UI |
| **Charm2** | Real CRM CRUD + ownership view |
| **Gap** | Tags/segments, photo timeline, merge duplicates, structured notes |
| **Recommendation** | Pilot: solid search, visit history, prefs, allergies note field. Next: tags (VIP / lapsed / allergy), merge dupes, photo timeline for fades (storage). CLV as report metric not separate fake page. |

### 2.17 Client Ownership (barber differentiator)

| | |
|--|--|
| **Prototype** | Partial — infers primary barber from completed visits |
| **Charm2** | Partial — read-heavy; assignment mutations limited |
| **Gap** | Managers need assign/protect / transfer ownership with reason |
| **Recommendation** | Explicit `preferred_staff_id` on customer + derived “last N visits.” Rules: protect book-follows-barber when selling chair rental; transfer with audit. Dashboard: at-risk clients if preferred barber leaving. |

### 2.18 Services

| | |
|--|--|
| **Prototype** | Real + `BARBER_CATEGORIES` (haircut, beard, shave…) |
| **Charm2** | Real CRUD; mode taxonomy not in contracts |
| **Gap** | Categories/labels not mode-driven from contracts |
| **Recommendation** | Put barber service categories in `packages/contracts` (or mode-terms). Duration + buffer + commission eligibility flags. Combos for fade+beard. |

### 2.19 Staff / Barber Directory & HR cycle

| Stage | Prototype | Charm2 | Gap | Recommendation |
|-------|-----------|--------|-----|----------------|
| Invite | Auth invite + role | Real invite + SMTP needed | Prod email | Wire SMTP; invite → accept → staff link |
| Role | senior/junior barber labels | Real roles via contracts/terms | — | Keep mode terms for labels |
| Chair assign | Mock seat rental fees | API has `StaffID`; FE CRUD no staff assign; gate mismatch | Cannot assign barber↔chair | Form: branch, chair label, staff, rate, period; gate `staff_commissions_payroll` |
| Schedule | Real edit | Display-only FE | Edit UI | See §2.12 |
| Attendance | Partial QR | Real QR | Nav gate | See §2.9 |
| Skills / specialties | Staff fields + Gap skill matrix | Specialties on staff | No matrix page | Use specialties array first; skill matrix later |
| Time-off | Gap-UI `/staff/time-off` | Missing | Daily leave | Add `time_off_requests` table + approve flow; block bookings |
| Shift swap | Gap-UI | Missing | Nice-to-have | After time-off |
| Onboarding checklist | Gap-UI | Missing | New hire ramp | Checklist template (clippers, hygiene, POS PIN) — settings-driven |
| Performance reviews | Gap-UI | Scorecards partial | Don’t duplicate | Prefer scorecards + 1:1 notes |
| Offboarding | Soft flag vaguely | API `is_active=false`; **no FE deactivate** | Chairs/clients left hanging | Offboard wizard: deactivate, revoke roles, end seat rental, reassign ownership, cancel future bookings or reassign |

### 2.20 POS & Payments

| | |
|--|--|
| **Prototype** | Real cart/cash/promo/stock; tip-prompt/tabs/offline = Gap-UI |
| **Charm2** | Real POS workspace; Pesapal **stub**; appointment strip improved; payments-demo theatre |
| **Gap** | No live collect; tip-at-checkout UX; open tabs; manager PIN discounts |
| **Recommendation** | Phase: (1) cash/manual complete + ledger (pilot); (2) Pesapal STK/card with Idempotency-Key + re-query IPN; (3) tip prompt %; (4) hold/tab for multi-service visits; (5) offline queue only after sync story solid. Remove payments-demo from nav. |

### 2.21 Tips

| | |
|--|--|
| **Prototype** | Partial `tips` CRUD |
| **Charm2** | Real pos extras; nav **ungated** vs `tips_management` → depends `pos_payments` |
| **Gap** | Gate mismatch; pooling / tip-out rules thin |
| **Recommendation** | Nav gate `tips_management`. Per-ticket tip attribution to barber. Optional tip pool for reception. Report in my-earnings. |

### 2.22 Retail products / Inventory / Consumption / Suppliers

| | |
|--|--|
| **Prototype** | Retail real; inventory partial; stock-take/PO/wastage = Gap-UI; barber **nav omits** inventory |
| **Charm2** | Real retail + inventory + consumption + suppliers APIs/pages; **orphan from barber nav** |
| **Gap** | Discovery + shop-floor UX |
| **Recommendation** | Add to barber Operations/Sales with `inventory_tracking`: stock of pomade/blade/cape; consumption linked to services (optional); suppliers for restock. Defer stock-take/PO until inventory actually used. |

### 2.23 Marketing, Promotions, Referrals, Loyalty, Packages, Gift cards

| | |
|--|--|
| **Prototype** | Marketing page **mock**; promotions/referrals Supabase real; loyalty/packages/gift partial; barber nav only “Marketing” |
| **Charm2** | Campaign CRUD real; SMS/WA send **stub**; other growth pages Real/CRUD but **orphan** in barber nav; reviews gated oddly on `marketing` |
| **Gap** | Nav; delivery; review feature key |
| **Recommendation** | Expand barber Growth to match beauty (loyalty, packages, gift cards, promotions, referrals, gallery). Gate correctly. Reviews use `customer_reviews`. Campaign **composer** OK before send stubs go live; hide Send or show “dry-run” until SMS/WA wired. Automations (winback, review request) after reminders work. |

### 2.24 Reviews

| | |
|--|--|
| **Prototype** | Partial list |
| **Charm2** | Real; historically visibility bugs; gate `marketing` on dashboard page |
| **Gap** | Feature key vs `customer_reviews`; reply workflow Gap-UI |
| **Recommendation** | Require completed visit. Surface on scorecards + public barber profile. Management reply later. Align Feature flags. |

### 2.25 Gallery (before/after)

| | |
|--|--|
| **Prototype** | Mock demo images; not in BARBER_NAV |
| **Charm2** | Page exists; often URL-only; orphan in barber |
| **Gap** | Upload + per-barber portfolio |
| **Recommendation** | MinIO/R2 upload; attach to staff + service. Client consent flag. Feeds marketing + public `/barbers/:id` style profile. |

### 2.26 Revenue Forecast

| | |
|--|--|
| **Prototype** | Hardcoded “AI” mock |
| **Charm2** | Minimal; bookings field `0` in SQL; projected ≈ actual |
| **Gap** | Misleading |
| **Recommendation** | Either: simple trailing-average projection + booked-forward pipeline, or remove from nav until real. No fake AI copy. |

### 2.27 Chair / Seat Rental (barber-specific economics)

| | |
|--|--|
| **Prototype** | Simulated fees from staff count; no table |
| **Charm2** | Real `seat_rentals` API under settings; FE missing staff assign; nav `multi_branch` vs API `staff_commissions_payroll` |
| **Gap** | Billing cycle, invoices, occupancy |
| **Recommendation** | Treat as **first-class barber business model**: assign chair → staff → weekly/monthly rent → ledger charge or invoice. Occupancy dashboard. Gate with dedicated `chair_rental` feature (or keep payroll feature but **fix nav**). Exclude from multi_branch-only. |

### 2.28 Staff Chat

| | |
|--|--|
| **Prototype** | Real messages |
| **Charm2** | Real + polling; historical bug likely fixed |
| **Gap** | No realtime WS for chat (polling OK short-term) |
| **Recommendation** | Keep; optional WS later. Branch channels. |

### 2.29 Branding / Notifications / Settings / Support

| | |
|--|--|
| **Prototype** | Branding partial; notifications real; support mock FAQ |
| **Charm2** | Real branding (URL logo), inbox, 2FA settings, enquiries support |
| **Gap** | Upload; push/SMS prefs; password reset / onboarding wizard still global gaps |
| **Recommendation** | Logo upload to storage. Tenant onboarding wizard post-signup (branch, hours, services, first barber invite). Forgot-password flow. Support stays lightweight ticket/enquiry. |

### 2.30 WhatsApp

| | |
|--|--|
| **Prototype** | Mock connect UI + inbox Gap-UI; edge function separate |
| **Charm2** | Log viewer; Meta send stub; orphan in barber |
| **Gap** | Two-way chat not productized |
| **Recommendation** | After Meta credentials: templates for booking confirm/remind/review. Inbox is phase 2. Do not ship “Connect” CTA that does nothing. |

### 2.31 Portal & Public booking (client-facing)

| | |
|--|--|
| **Prototype** | Portal partial; wallet/push mock |
| **Charm2** | Portal routes + public book; wallet/notifs still weak per deploy doc |
| **Gap** | Wallet localStorage; notification prefs local |
| **Recommendation** | Public book + portal bookings first-class for Haus of Barber. Wallet = loyalty balance server-side. Prefs on customer record. |

### 2.32 Prototype Gap-UIs — adoption policy (do not dump into nav)

Port only when there is a **Go schema + RequireFeature + E2E**. Priority for barber daily use:

| Gap-UI path | Keep / Build / Defer | Why |
|-------------|----------------------|-----|
| `/staff/time-off` | **Build** | Daily HR |
| `/bookings/buffer` | **Build** (as service field) | Floor realism |
| `/bookings/deposits` | **Build** after payments | No-shows |
| `/bookings/cancellation-policy` | **Build** (org settings) | Policy text + fee rule |
| `/pos/tip-prompt` | **Build** with POS | Daily tip capture |
| `/pos/discount-approvals` | **Build** | Shrinkage control |
| `/clients/merge`, `/clients/tags` | **Build** | CRM hygiene |
| `/clients/photos` | **Build** with gallery | Barber portfolio |
| `/finance/pnl` | **Build** (computed) | Owner weekly review |
| `/finance/export` | **Build** CSV | Accountant |
| `/finance/receipt-ocr` | **Defer** | Mock forever until OCR vendor |
| `/finance/multi-currency` | **Defer** | KE-first |
| `/finance/cash-flow` | **Defer** | After P&amp;L trusted |
| `/pos/tabs`, offline, barcode, customer-display | **Defer** | After live pay |
| `/inventory/stock-take`, PO, wastage, transfers | **Defer** | After inventory adopted |
| `/marketing/*` advanced | **Defer** | After SMS/WA live |
| `/field-ops/*`, `/clinical/*` | **N/A-barber** | Other modes |
| `/platform/*` extras | **Selective** | 2FA already in settings; API keys enterprise |

---

## 3. Feature-gate mismatch register (fix before polish)

| Item | Nav | Page | API | Fix |
|------|-----|------|-----|-----|
| `/seat-rental` | `multi_branch` | `staff_commissions_payroll` | `staff_commissions_payroll` | Nav → same as API; consider new `chair_rental` |
| `/tips` | none | `tips_management` | `tips_management` | Add nav feature |
| `/qr-clock`, `/qr-attendance` | none | `qr_clock` | `qr_clock` | Add nav feature |
| `/scorecards`, `/call-centre`, `/revenue-forecast` | none | `advanced_analytics` | `advanced_analytics` | Add nav feature or hide |
| `/my-earnings` | none | `advanced_analytics` | advanced analytics | Move to payroll/earnings feature |
| `/reviews` | none | `marketing` | mixed | Use `customer_reviews` |
| `/branches` | none | `multi_branch` | often none | Align all three |
| `/retail-products` | none | `inventory_tracking` | yes | Add nav feature |
| `/payments-demo` | none | `pos_payments` | n/a | Remove from nav |

---

## 4. Hardcoded / stub index (charm2)

| Kind | Location | Action |
|------|----------|--------|
| Scorecard fake % | `analytics/repository.go` punctuality/retention | Compute or drop |
| Monthly target | `analytics/repository.go` 500000 | Org setting |
| Forecast bookings = 0 | `analytics/repository.go` | Use real booked pipeline |
| Chair util = 0 | dashboard FE | Compute |
| DialPad contacts | Call centre DialPad | Remove or enquiry-only UI |
| Pesapal / OpenFloat / SMS / WhatsApp | integrations + notifications | Live clients for money/comms phases |
| Payments demo | `/payments-demo` | Hide prod |
| Field ops stub tabs | field-operations page | Remove from barber nav |

---

## 5. Recommended adoption strategy (lanes)

```text
Lane A — Surface what already works
  Expand barber.json Growth + Inventory like beauty.json
  Gate correctly; hide demo/field-ops
  Cost: contracts + generate:e2e-routes + smoke

Lane B — Harden daily shop loop
  Waitlist picker, schedule write UI, walk-in one-tap,
  ownership assign, staff offboard, audit completeness,
  scorecards real metrics, expense receipt upload, P&L compute
  Cost: FE + targeted API; high barber ROI

Lane C — Money & payroll truth
  Pesapal + ledger, tips at POS, commission lines,
  chair rental assign + rent posting, payroll export
  Cost: integrations + finance correctness

Lane D — Comms & growth send
  SMTP prod, SMS/WA templates, campaign send, gallery upload
  Cost: provider creds + templates

Lane E — Selected Gap-UI promotions
  time-off, buffer, deposits, tip-prompt, client merge/tags,
  discount PIN — each with schema + feature + E2E
  Cost: per module; never bulk-port localStore
```

Do **not** attempt to recreate the entire prototype command-palette surface. Many Gap-UIs were exploration chrome.

---

## 6. Daily-ops improvement suggestions by role

### Owner / CEO / Director
- Trustworthy P&amp;L: revenue − expenses − commissions − tips payouts − chair rent income.
- Barber scorecards that drive coaching (not vanity 85%).
- Branch comparison when `multi_branch`.
- Audit trail for money and HR.
- Hide anything that cannot settle money or notify clients.

### Branch manager
- Editable week schedule + attendance exceptions.
- Queue board + waitlist conversion.
- POS day close / reconciliation once payments live.
- Staff invite + offboard + chair assignment.

### Reception
- Book wizard + client search (phone).
- Walk-in add without UUID.
- Cash POS + tip capture.
- No payments-demo.

### Senior / Junior barber (My Chair)
- My schedule, clock-in, my bookings, my clients, my reviews, **my earnings** (correct gate).
- Portfolio gallery later.
- Ownership visibility of “my” clients.

---

## 7. Suggested implementation phases (critical → least)

> Implementation plan details can be split to a follow-up plan doc; this section is the **priority order** derived from the audit.

### Phase 0 — Truth & trust (1–2 weeks)

1. Feature-gate alignment table (§3).  
2. Remove `/payments-demo` and `/field-operations` from barber nav.  
3. Add orphan Growth + Inventory items from beauty (loyalty, packages, gift-cards, promotions, referrals, gallery, inventory, consumption, suppliers) with correct `requiredFeature`.  
4. Regenerate E2E nav routes; smoke green.  
5. Wire prod SMTP for invites/2FA (env).  
6. Audit logging coverage for money + HR mutations.

### Phase 1 — Floor ops blockers (barber daily)

1. Waitlist: customer search, not UUID.  
2. Schedule: create/edit shifts in UI.  
3. Queue: one-tap walk-in + board freshness (WS health).  
4. Client ownership: assign / transfer + audit.  
5. Staff deactivate / offboard wizard.  
6. Seat-rental: staff_id + gate fix.  
7. Dashboard chair util + org monthly target.  
8. Scorecards: real punctuality/retention or remove fake columns.

### Phase 2 — Money loop

1. Live Pesapal + idempotent IPN + server amounts.  
2. Tips at POS → tips ledger → my-earnings.  
3. Commission lines on completion.  
4. Expense receipt upload to object storage.  
5. Computed P&amp;L + CSV finance export.  
6. Reconciliation API (replace placeholder) for day cash-up.  
7. OpenFloat / payouts when commission payouts go live.

### Phase 3 — HR depth

1. Time-off requests + approval + booking block.  
2. Attendance → payroll + scorecards wiring.  
3. Chair rental invoices / rent schedule.  
4. Onboarding checklist (config-driven).  
5. Shift swap (optional).  
6. Payroll CSV/PDF export; contractor vs employee modes.

### Phase 4 — Growth & comms

1. SMS/WA providers live; booking reminders.  
2. Marketing campaign send (no dry-run theatre).  
3. Gallery upload + staff portfolio.  
4. Review request automation after completed visit.  
5. WhatsApp in barber nav once send works.

### Phase 5 — Advanced / selective Gap-UIs

1. Booking deposits + cancellation policy settings.  
2. Service buffer minutes.  
3. POS discount PIN + open tabs.  
4. Client merge/tags/photos.  
5. Inventory stock-take / PO if retail volume justifies.  
6. Forecast as booked pipeline + trailing average (no fake AI).  
7. Enquiry desk polish (ex-call-centre).

### Explicitly out of Haus of Barber roadmap

- Field ops GPS, clinical SOAP, telehealth, shop storefront as primary (products mode), multi-currency OCR theatre.

---

## 8. Acceptance criteria (definition of “complete” for barber pilot)

A tenant on professional plan can:

1. Invite barbers, set schedule, clock QR, take appointments + walk-ins.  
2. Check out on POS (at least cash path with correct ledger).  
3. Record expenses and see week revenue vs expense.  
4. See real barber performance (no hardcoded retention/punctuality).  
5. Assign client ownership and chair rentals without 403 from wrong gates.  
6. Never see payments-demo or mobile field ops in sidebar.  
7. Open loyalty/packages/inventory from Growth/Sales when features entitlement on.  
8. E2E: nav smoke + CRUD + booking/POS/finance flows green on Docker prod web.

---

## 9. Cross-check matrix (compressed)

| Domain | Prototype | Charm2 | Action |
|--------|-----------|--------|--------|
| Expenses | Real + mock P&amp;L siblings | Real under Finance | Harden P&amp;L + upload |
| Bookings | Real + Gap advanced | Real | Polish + buffers later |
| Customers | Real + Gap CRM | Real + thin ownership | Assign + tags/merge |
| Marketing | Mock hub + real promos | CRUD + stub send + orphans | Surface nav + live send |
| HR | Real staff + Gap HR suite | Invite OK; schedule RO; no offboard | Schedule write + time-off + offboard |
| Payroll | Partial client calc | Real API | Export + chair-renter mode |
| Attendance | Partial QR | Real | Gate + scorecard feed |
| Commissions | Client calc | Real | Immutable lines |
| POS | Real + Gap POS | UI real; pay stub | Pesapal + tips |
| Queue | Partial | Real | Walk-in UX |
| Scorecards | Mock | Fake metrics | Compute |
| Chair rental | Mock | Partial | Assign + gate |
| Inventory | Partial; not in barber nav | Real orphan | Add to nav |
| Gallery | Mock | Orphan | Upload + nav |
| Call centre | Mock | Stats + fake pad | Enquiry desk |
| Field ops | Mock; in nav | Stub; in nav | **Remove** from barber |

---

## 10. Next step

Use this audit as input for a **phased implementation plan** (tickets per phase with file owners). Prefer Lane A+B before money theatre. Do not open PRs that port Gap-UI pages without schemas.

*Update this doc when a phase ships or when barber.json / features change.*
