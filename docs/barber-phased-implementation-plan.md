# Haus of Barber — Phased Implementation Plan

**Audit:** [haus-of-barber-audit.md](./haus-of-barber-audit.md)  
**Flows:** [barber-flows.md](./barber-flows.md)  
**Rule:** Execute one phase at a time. Phase N tests green before Phase N+1 starts. Money tickets write audit events in AC. Gate mismatches fixed in the same ticket that touches the page. Gap-UIs need schema + `RequireFeature` + E2E before nav ships.

**Ticket ID scheme:** `B{phase}-{nn}` (+ optional `b` suffix for better-on-top follow-on).

---

## Phase 0 — Truth & trust

**Goal:** Sidebar tells truth. Gates match. Stub surfaces gone from barber IA. Orphans discoverable. SMTP path documented. Money/HR mutations start auditing.

**Out of phase:** Live Pesapal/SMS/WA (hide claims only). Scorecard compute (Phase 1). Schedule write UI (Phase 1).

---

### B0-01 — Align feature gates (nav + page + API)

| Field | Content |
|-------|---------|
| **Type** | gate fix |
| **Files** | [`packages/contracts/domain/nav/barber.json`](../packages/contracts/domain/nav/barber.json); dashboard page Feature wrappers for `/tips`, `/qr-clock`, `/qr-attendance`, `/scorecards`, `/call-centre`, `/revenue-forecast`, `/my-earnings`, `/reviews`, `/branches`, `/retail-products`, `/seat-rental`; corresponding `RequireFeature` on API already where noted |
| **Current** | Partial/mismatch — audit §3 |
| **Target** | Operator without entitlement never sees nav item; with nav, page + API use **same key**. Seat-rental nav `staff_commissions_payroll` (not `multi_branch`). Tips → `tips_management`. QR → `qr_clock`. Scorecards/call-centre/forecast → `advanced_analytics`. My-earnings → `staff_commissions_payroll` (page + analytics route gate). Reviews → `customer_reviews`. Branches → `multi_branch` on nav. Retail → `inventory_tracking`. |
| **Data model** | None (optional later `chair_rental` key deferred to B1-06 if needed) |
| **Feature gate** | **This ticket IS the §3 register fix** for listed paths |
| **Flow** | C5a attendance gates; D tips/earnings; E reviews peripheral; seat gate for C4 |
| **Test plan** | **Unit:** N/A contracts JSON schema/lint if any. **Integration:** API 403 without feature for tips/QR/scorecards/seat/my-earnings. **E2E:** seed org without advanced_analytics — scorecards/call-centre/forecast not in sidebar; with features on — items visible and load (not 403). |
| **Depends** | None |

---

### B0-02 — Remove stub surfaces from barber nav

| Field | Content |
|-------|---------|
| **Type** | gate fix / hardening |
| **Files** | `packages/contracts/domain/nav/barber.json` (drop `/payments-demo`, `/field-operations`); optionally guard `apps/web/app/(dashboard)/payments-demo/page.tsx` + field-operations with “unavailable in barber” or leave route but unlisted |
| **Current** | Stub — payments-demo theatre; field-ops stub tabs on barber ops |
| **Target** | Barber sidebar never shows Payments Demo or Field Operations. **Hide** (not make Pesapal real here). |
| **Data model** | None |
| **Feature gate** | N/A (removal) |
| **Flow** | Protects A6/B4 from fake “pay” Demo UX |
| **Test plan** | **E2E:** generated nav routes exclude those paths for barber; smoke does not require them for barber mode. Assert sidebar labels absent for demo CEO. |
| **Depends** | Soft after B0-01 order OK either way; do before B0-04 regen |

**Better-on-top B0-02b — Hide DialPad softphone on call-centre**

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web` call-centre page / `DialPad.tsx` |
| **Current** | Stub hardcoded contacts |
| **Target** | Softphone UI hidden or replaced with “Enquiries” stats only until Phase 5. Never looks like live dial. |
| **Depends** | B0-01 (page still gated `advanced_analytics`) |
| **Test plan** | E2E call-centre: no fake phone dial success toast / no hardcoded contact click-to-call claim |

---

### B0-03 — Surface orphan Growth + Inventory in barber nav

| Field | Content |
|-------|---------|
| **Type** | missing-feature build (IA only — pages/APIs exist) |
| **Files** | `packages/contracts/domain/nav/barber.json` — mirror beauty pattern: `/loyalty`, `/packages`, `/gift-cards`, `/promotions` (`promotions_referrals`), `/referrals` (`promotions_referrals`), `/gallery`, `/inventory` / `/consumption` / `/suppliers` (`inventory_tracking`); ensure `/reviews` Growth entry uses `customer_reviews` if role section added for ceo |
| **Current** | Orphan — Real pages, absent from barber IA |
| **Target** | CEO/director (and beauty-parity roles) open Loyalty, Packages, Gift Cards, Promotions, Referrals, Gallery, Inventory, Consumption, Suppliers from sidebar when features on. Marketing stays. **WhatsApp stays out** until Phase 4 (send Stub). |
| **Data model** | None |
| **Feature gate** | Match beauty + audit: loyalty none or `loyalty`; packages/gift via `marketing` or none as beauty; promos/referrals `promotions_referrals`; inventory trio `inventory_tracking` |
| **Flow** | Enables growth after visits (E2→loyalty later Phase 4) |
| **Test plan** | **E2E:** after `generate:e2e-routes`, barber smoke hits new paths when features seeded; org without `inventory_tracking` — inventory items absent |
| **Depends** | B0-01 for gate consistency; B0-02 complete so regen is clean |

---

### B0-04 — Regenerate E2E nav routes + barber smoke green

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web/scripts/generate-e2e-routes.mjs`; `apps/web/e2e/generated/nav-routes.ts`; `playwright.config.ts` if needed; smoke specs under `apps/web/e2e/` |
| **Current** | Partial — routes drift when nav changes |
| **Target** | `npm run generate:e2e-routes` (+ `--check` clean). Barber union routes reflect B0-01–03. Smoke pass against Docker prod web for barber-critical paths. |
| **Data model** | None |
| **Feature gate** | N/A |
| **Flow** | Cross-cutting |
| **Test plan** | Run `generate:e2e-routes --check`; `E2E_PROD=1` nav smoke subset for barber paths; no orphans; removed paths absent |
| **Depends** | B0-01, B0-02, B0-03 |

---

### B0-05 — SMTP path for invites / 2FA (env + fail-closed UX)

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `infra`/compose SMTP env docs; `apps/api` email sender config; invite + 2FA handlers already exist — ensure clear error when `EMAIL_DRY_RUN` or MailHog-only; docs checklist in plan progress note |
| **Current** | Partial — MailHog/LogSender defaults |
| **Target** | Prod checklist: `SMTP_*`, `EMAIL_FROM`, `EMAIL_DRY_RUN=false`. Invite UI surfaces “email not sent / dry-run” if dry-run. No fake “email delivered” when logged only. |
| **Data model** | None |
| **Feature gate** | N/A |
| **Flow** | C1 invite |
| **Test plan** | **Integration:** invite with dry-run logs + response flag. **E2E:** invite flow still creates token (existing staff-invite); assert no claim of delivery under dry-run if FE shows status |
| **Depends** | None (parallel with B0-01) |

---

### B0-06 — Audit logging coverage for money + HR mutations

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/api` audit helper usage in: POS complete/cash sale, expense create/update/delete, staff invite, staff deactivate (when exists), seat-rental CRUD, commission/payroll if present; verify append-only `audit_log` |
| **Current** | Partial — viewer Real; many mutations silent |
| **Target** | Creating expense, completing sale (cash), inviting staff → each writes audit row with actor + org + action. Future money tickets extend same helper (AC inherits). |
| **Data model** | None if table exists; else ensure columns for action/entity/meta |
| **Feature gate** | N/A |
| **Flow** | A8, C1, D6, E5 prerequisite |
| **Test plan** | **Unit:** audit writer formats payload. **Integration:** POST expense → GET audit contains expense.create. POS cash complete → payment/sale audit. Invite → staff.invite audit. **E2E:** optional audit-log page shows new event after expense in finance-flows |
| **Depends** | None; do early so later phases extend |

**Better-on-top B0-06b — Audit filter by action type in UI**

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | `apps/web` audit-log page |
| **Target** | Manager filters audit by `payment`, `expense`, `staff` without CSV export |
| **Depends** | B0-06 |
| **Test plan** | E2E select filter → list narrows |

---

## Phase 1 — Floor ops blockers

**Goal:** Daily shop loop: waitlist, schedule write, walk-in, ownership, offboard, chair assign, dashboard truth, real scorecards.

---

### B1-01 — Waitlist customer picker (no raw UUID)

| Field | Content |
|-------|---------|
| **Type** | bug fix / hardening |
| **Files** | `apps/web/app/(dashboard)/waitlist/page.tsx` (+ client search component reuse from bookings/clients); booking waitlist API if needed |
| **Current** | Partial — UUID placeholder |
| **Target** | Reception searches client by name/phone, adds waitlist entry, converts to booking in one action. |
| **Data model** | None expected |
| **Feature gate** | `bookings` (existing) |
| **Flow** | Adjacent to B walk-in; feeds A1 |
| **Test plan** | **E2E:** add waitlist via search → row shows client name not UUID |
| **Depends** | Phase 0 complete |

**Better-on-top B1-01b — Waitlist → booking one-click when slot free**

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Target** | Button converts waitlist row to confirmed booking for preferred barber |
| **Depends** | B1-01 |
| **Test plan** | E2E convert → booking appears on schedule |

---

### B1-02 — Schedule create/edit UI

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `apps/web/app/(dashboard)/schedule/page.tsx`; `apps/api/internal/modules/staff` schedule handlers (already CRUD) |
| **Current** | Partial — FE read-only |
| **Target** | Manager sets hours / day-off / copy week for a barber; conflicts with bookings warned. Barber My Schedule reflects changes. |
| **Data model** | None if `staff_schedules` sufficient |
| **Feature gate** | none / bookings ops |
| **Flow** | C3 |
| **Test plan** | **Integration:** POST/PATCH schedule. **E2E:** set Monday 09–17 → reload grid shows; booking outside hours blocked or warned |
| **Depends** | Phase 0 |

---

### B1-03 — Walk-in one-tap + queue stage transitions

| Field | Content |
|-------|---------|
| **Type** | hardening / missing-feature build |
| **Files** | `apps/web/.../queue/page.tsx`; `apps/api` booking create walk-in; WS hub if needed |
| **Current** | Partial — derived queue |
| **Target** | Reception: Add walk-in (client + service + barber\|next) → Waiting → In-chair → Done without UUID. Stages map to booking status. |
| **Data model** | Ensure `is_walkin` (or equivalent) on bookings if missing |
| **Feature gate** | `queue` |
| **Flow** | Flow B entire; A4 check-in overlap |
| **Test plan** | **Integration:** create walk-in booking. **E2E:** add → advance statuses → done → eligible for POS |
| **Depends** | B1-01 helpful but not hard |

**Better-on-top B1-03b — Real-time est. wait from avg service duration × position**

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Target** | Board shows ETA minutes from completed services last 7d avg |
| **Depends** | B1-03 |
| **Test plan** | Unit ETA math; E2E shows non-zero ETA with seed history |

---

### B1-04 — Client ownership assign / transfer + audit

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `apps/api/internal/modules/crm` ownership mutations; `apps/web/.../client-ownership/page.tsx`; customers `preferred_staff_id` if needed |
| **Current** | Partial — read-heavy |
| **Target** | Manager assigns preferred barber; transfers with **required reason**; audit event; UI shows owner. |
| **Data model** | Column or ownership table + reason on transfer events |
| **Feature gate** | `crm` |
| **Flow** | Flow E; C7 reassign uses same API |
| **Test plan** | **Unit:** transfer requires reason. **Integration:** PATCH ownership → audit. **E2E:** transfer A→B → list updates |
| **Depends** | B0-06 |

**Better-on-top B1-04b — At-risk clients when preferred barber offboards**

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Target** | Offboard or transfer source lists clients needing reassignment |
| **Depends** | B1-04, B1-05 |
| **Test plan** | E2E offboard → at-risk panel non-empty |

---

### B1-05 — Staff offboarding wizard

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `apps/web/.../staff/page.tsx`; `apps/api/internal/modules/staff` deactivate; revoke membership; call ownership + booking reassign + seat end |
| **Current** | ❌ / thin API soft-delete |
| **Target** | Deactivate → revoke login → reassign or flag clients → reassign/cancel future bookings → end seat rental; all audited. |
| **Data model** | Possibly `deactivated_at`, offboard reason |
| **Feature gate** | staff ops (authenticated managers) |
| **Flow** | C7 |
| **Test plan** | **Integration:** offboard cascade. **E2E:** wizard completes; staff inactive; rental ended |
| **Depends** | B1-04, B1-06 (seat end); B0-06 |

---

### B1-06 — Chair rental staff assign + gate fix

| Field | Content |
|-------|---------|
| **Type** | gate fix + missing-feature build |
| **Files** | `barber.json` seat feature (already B0-01); `apps/web` seat-rental crud-configs + page; `apps/api/.../settings` seat-rentals |
| **Current** | Partial — API StaffID; FE no assign; was §3 mismatch |
| **Target** | Form: branch, label, **staff**, rate, notes. Save assigns chair. Nav/page/API all `staff_commissions_payroll` (or introduce `chair_rental` in features.json if cleaner — prefer **same key as API** this ticket). Money change → audit. |
| **Data model** | Ensure `staff_id` persisted; branch_id if missing on FE |
| **Feature gate** | **§3 seat-rental — complete alignment in this ticket** |
| **Flow** | C4 |
| **Test plan** | **Integration:** create rental with staff_id. **E2E:** assign barber to chair → list shows name |
| **Depends** | B0-01 |

**Better-on-top B1-06b — Occupancy % on chair rental page**

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Target** | Occupied chairs / total this week from bookings |
| **Depends** | B1-06 |
| **Test plan** | Unit occupancy; E2E shows % |

---

### B1-07 — Dashboard chair util + org monthly target

| Field | Content |
|-------|---------|
| **Type** | bug fix / hardening |
| **Files** | `apps/api/internal/modules/analytics/repository.go`; org settings for target; `apps/web/.../dashboard/page.tsx` |
| **Current** | Stub metrics — target 500000; chairUtil 0 |
| **Target** | Target from org settings (default ok). Chair util from booked chair-minutes / open minutes. **Hide** if cannot compute rather than show 0 as insight. |
| **Data model** | `organizations.settings` JSON or columns `monthly_revenue_target_kes`, `chair_count` |
| **Feature gate** | `basic_reports` |
| **Flow** | Supports B5 scorecard context |
| **Test plan** | **Unit:** util formula. **Integration:** settings update → reports reflect. **E2E:** dashboard not stuck at 0 when seed bookings exist |
| **Depends** | B1-02 optional (open hours); B1-06 optional (chair count) |

---

### B1-08 — Scorecards real punctuality & retention (or drop columns)

| Field | Content |
|-------|---------|
| **Type** | bug fix |
| **Files** | `apps/api/internal/modules/analytics/repository.go`; scorecards page |
| **Current** | Stub — SQL `85.0` / `72.0` |
| **Target** | Punctuality from attendance vs schedule; retention from rebook within N days per barber. **Or** remove columns until computable — never fake. Gate remains `advanced_analytics` (B0-01). |
| **Data model** | None |
| **Feature gate** | `advanced_analytics` |
| **Flow** | B5, C5a feed |
| **Test plan** | **Unit:** metrics from fixtures. **Integration:** seed late clock-in → punctuality &lt; 100. **E2E:** scorecards page values change with seed (not constant 85/72) |
| **Depends** | B1-02 (schedule), attendance data; B0-01 |

---

## Phase 2 — Money loop

**Policy:** Make Pesapal/OpenFloat **real** in tickets below, or keep Stub and never show success theatre. Cash path must audit + commission lines.

---

### B2-01 — Live Pesapal collect + idempotent IPN

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `apps/api/internal/modules/integrations/pesapal/`; POS checkout; Redis idempotency; ledger post |
| **Current** | Stub redirect / fake IPN |
| **Target** | Real checkout; IPN re-queries GetTransactionStatus; server computes amount; booking/sale complete only on auth status; audit payment. |
| **Data model** | payment intents / merchant refs as needed |
| **Feature gate** | `pos_payments` |
| **Flow** | A6, B4 |
| **Test plan** | **Unit:** amount calc, idempotency. **Integration:** IPN replay safe. **E2E:** staging checklist or mocked provider contract test — never fake “paid” in UI without status |
| **Depends** | Phase 1; B0-06 |

---

### B2-02 — Tips at POS → ledger → my-earnings

| Field | Content |
|-------|---------|
| **Type** | hardening / missing-feature build |
| **Files** | POS workspace tip capture; `pos/extras_*` tips; my-earnings (gate already payroll from B0-01) |
| **Current** | Partial tips CRUD; weak POS tip prompt |
| **Target** | Checkout tip %/amount attributed to barber; my-earnings shows tips; audit tip.create. |
| **Data model** | tips rows linked txn_id |
| **Feature gate** | `tips_management` (nav from B0-01) |
| **Flow** | C5b, D3, A6 |
| **Test plan** | **E2E:** cash+tip → tips page + my-earnings |
| **Depends** | B0-01; cash path; B2-01 if card tip |

---

### B2-03 — Atomic commission lines on sale completion

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `apps/api` payroll/pos completion hook; new `commission_lines` migration; commissions UI sum lines |
| **Current** | ❌ broken link A7 |
| **Target** | Every completed ticket writes immutable line (staff, rate, base, amount). Period report = SUM. Adjustments = reversing line + audit. |
| **Data model** | **New table** `commission_lines` |
| **Feature gate** | `staff_commissions_payroll` |
| **Flow** | A7, D2, B4 |
| **Test plan** | **Unit:** rate application. **Integration:** complete sale → line exists; double-complete no double line. **E2E:** commissions page shows line after POS |
| **Depends** | Sale completion path; B0-06 |

---

### B2-04 — Expense receipt upload (object storage)

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | finance page upload; storage client MinIO/R2; expense `receipt_url` |
| **Current** | Partial URL-only |
| **Target** | Manager uploads receipt image/PDF; stored; expense row has URL; audit expense.update |
| **Data model** | None |
| **Feature gate** | finance (existing) |
| **Flow** | Money ops |
| **Test plan** | **Integration:** upload + attach. **E2E:** record expense with file |
| **Depends** | B0-06 |

---

### B2-05 — Computed P&amp;L + CSV finance export

| Field | Content |
|-------|---------|
| **Type** | missing-feature build (promote Gap-UI properly) |
| **Files** | ledger analytics; finance page P&amp;L tab; export endpoint |
| **Current** | Prototype Gap-UI mock; charm2 Real expenses only |
| **Target** | Server P&amp;L = revenue − expenses (− commissions optional toggle) by month; CSV download. No hardcoded months. |
| **Data model** | None |
| **Feature gate** | `basic_reports` or finance |
| **Flow** | Owner finance |
| **Test plan** | **Unit:** P&amp;L math. **Integration:** export CSV headers. **E2E:** P&amp;L numbers match seeded tx − expenses |
| **Depends** | expenses Real; B2-03 optional for commission column |

---

### B2-06 — Reconciliation API + replace placeholder page

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | new reconciliation service; `apps/web/.../reconciliation/page.tsx`; add to barber nav with `pos_payments` after Real |
| **Current** | Stub placeholder |
| **Target** | Day cash-up: expected cash/card vs counted; variance; audit close. **Hide** until API exists (do not nav stub). |
| **Data model** | `reconciliation_runs` table |
| **Feature gate** | `pos_payments` |
| **Flow** | After A6 |
| **Test plan** | **Integration:** close day. **E2E:** reconcile flow |
| **Depends** | B2-01 or cash totals Real |

---

### B2-07 — OpenFloat disburse for commission payouts

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `integrations/openfloat/`; payouts service |
| **Current** | Stub |
| **Target** | Real disburse **or** keep Stub and hide “Paid out” until live. When real: idempotent; audit payout. |
| **Data model** | payout rows |
| **Feature gate** | `staff_commissions_payroll` |
| **Flow** | D after payslip |
| **Test plan** | Contract tests with mock; no fake success in FE |
| **Depends** | B2-03, B3-06 soft |

---

## Phase 3 — HR depth

---

### B3-01 — Time-off requests + approve + booking block

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top / Gap-UI promote |
| **Files** | new module or staff sub; migration; nav under staff; feature key e.g. `staff_time_off` in features.json **default false** |
| **Current** | Gap-UI prototype only |
| **Target** | Barber requests leave → manager approve/deny → approved days block new bookings; audit. Nav only after Real. |
| **Data model** | **`time_off_requests`** |
| **Feature gate** | new registry key |
| **Flow** | C6 |
| **Test plan** | Full trilogy tests; E2E request→approve→book conflict |
| **Depends** | B1-02 |

---

### B3-02 — Attendance → payroll + scorecards wiring

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | payroll formula; scorecards (post B1-08) |
| **Current** | Partial disconnect |
| **Target** | Payslip days_worked from QR; scorecard uses same source. |
| **Feature gate** | `qr_clock` + `staff_commissions_payroll` |
| **Flow** | D1, B5 |
| **Test plan** | Integration payslip hours = scans |
| **Depends** | B1-08, B2-03 |

---

### B3-03 — Chair rental invoices / rent schedule

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | settings/seat + ledger charges |
| **Current** | Partial rental row |
| **Target** | Periodic rent posts to ledger; chair renter settlement ≠ salary payslip. Audit rent.post. |
| **Data model** | rent schedule / invoice rows |
| **Feature gate** | same as seat (`staff_commissions_payroll` or `chair_rental`) |
| **Flow** | C4, D chair path |
| **Test plan** | Integration period post |
| **Depends** | B1-06, B2-05 helpful |

---

### B3-04 — Onboarding checklist (config-driven)

| Field | Content |
|-------|---------|
| **Type** | Gap-UI promote |
| **Files** | staff onboarding; org checklist template in settings |
| **Current** | Gap-UI |
| **Target** | New hire checklist (clippers, hygiene, POS); stored completion; feature gated. |
| **Data model** | checklist templates + completions |
| **Feature gate** | new key default false |
| **Flow** | After C2 |
| **Test plan** | E2E complete checklist |
| **Depends** | C2 invite |

---

### B3-05 — Shift swap (optional)

| Field | Content |
|-------|---------|
| **Type** | Gap-UI promote |
| **Target** | Request swap → approve → schedules exchange |
| **Data model** | `shift_swap_requests` |
| **Feature gate** | new key |
| **Depends** | B1-02, B3-01 |
| **Test plan** | E2E swap |

---

### B3-06 — Payroll export + employee vs contractor modes

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | payroll module; export |
| **Current** | Partial |
| **Target** | CSV/PDF export; contractor (chair) settlement separate from employee payslip; audit export. |
| **Feature gate** | `staff_commissions_payroll` |
| **Flow** | D4–D6 |
| **Test plan** | Export non-empty; amounts match lines+tips+attendance |
| **Depends** | B2-03, B3-02, B3-03 |

---

## Phase 4 — Growth & comms

**Policy:** SMS/WA — make real or hide Send.

---

### B4-01 — SMS + WhatsApp providers live (reminders)

| Field | Content |
|-------|---------|
| **Type** | missing-feature build |
| **Files** | `notifications/sms.go`, `whatsapp.go`; reminder jobs |
| **Current** | Stub |
| **Target** | Booking confirm/remind templates send for real; dry-run flag explicit. Failures visible. |
| **Feature gate** | `sms_reminders` |
| **Flow** | After A2 |
| **Test plan** | Provider contract + job test; E2E skip live (manual staging checklist) |
| **Depends** | Phase 0 SMTP pattern |

---

### B4-02 — Marketing campaign real send

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | marketing send service |
| **Current** | Stub send |
| **Target** | Send uses B4-01 providers; no theatre toast |
| **Feature gate** | `marketing` |
| **Test plan** | Integration send queued |
| **Depends** | B4-01 |

---

### B4-03 — Gallery upload + staff portfolio

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | gallery page; storage; staff link |
| **Current** | Orphan / URL-only |
| **Target** | Upload before/after; attach staff; barber My Chair can view |
| **Feature gate** | marketing/custom or none + nav from B0-03 |
| **Test plan** | E2E upload appears |
| **Depends** | B0-03, storage (B2-04 pattern) |

---

### B4-04 — Automated review request after checkout

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Target** | After completed visit, SMS/WA/email review link once |
| **Feature gate** | `customer_reviews` + `sms_reminders` |
| **Flow** | After A6 |
| **Depends** | B4-01, B2 sale complete |
| **Test plan** | Job enqueued on complete |

---

### B4-05 — WhatsApp in barber nav (only when send real)

| Field | Content |
|-------|---------|
| **Type** | gate fix / IA |
| **Files** | `barber.json` add `/whatsapp` with `sms_reminders` |
| **Current** | Orphan; send Stub |
| **Target** | Nav entry only after B4-01. Until then stay out (B0-03). |
| **Depends** | B4-01 |
| **Test plan** | E2E nav present when feature on |

---

## Phase 5 — Advanced / selective Gap-UIs

Each ticket: schema + feature + E2E before nav.

| ID | Title | Type | Gate | Depends | Test focus |
|----|-------|------|------|---------|------------|
| B5-01 | Deposits + cancellation policy settings | Gap promote | bookings + pos | B2-01 | Fee on late cancel |
| B5-02 | Service buffer minutes | Gap promote | bookings | B1-02 | Slot padding |
| B5-03 | POS discount PIN + open tabs | Gap promote | pos_payments | B2-01 | PIN required; tab hold |
| B5-04 | Client merge / tags / photos | Gap promote | crm | B1-04 | Merge keeps history |
| B5-05 | Inventory stock-take / PO | Gap promote | inventory_tracking | B0-03 adopt | Count adjusts stock |
| B5-06 | Forecast = pipeline + trailing avg | bug fix | advanced_analytics | B1-07 | No fake AI; bookings ≠ 0 |
| B5-07 | Enquiry desk (ex DialPad) | hardening | advanced_analytics | B0-02b | Manual enquiry → book |

**Better-on-top examples:** B5-01b no-show auto-fee; B5-04b VIP tag auto from spend; B5-06b capacity warning when forecast &gt; chair hours.

---

## Phase execution checklist

After each phase:

1. All phase tickets Done or explicitly Deferred with reason.  
2. Go unit + integration green for touched modules.  
3. E2E smoke (+ new flows) green on Docker prod web.  
4. Short status note in this doc under **Progress**.  
5. Only then start next phase.

### Progress

| Phase | Status | Shipped | Open | Deviations |
|-------|--------|---------|------|------------|
| 0 | **Complete** (pending full E2E stack run on your machine) | B0-01 gates nav+API+pages; B0-02 removed payments-demo/field-ops from barber nav; B0-03 Growth+Inventory orphans; B0-04 nav routes regen; B0-05 SMTP checklist + `email_delivered` fail-closed; B0-06 audit on expense/POS/invite; B0-02b DialPad hidden | Full `E2E_PROD=1` suite not run here (disk space on `go build ./...`) | Union `nav-routes.ts` still lists payments-demo/field-ops from other modes — barber sidebar test asserts hidden |
| 1 | **In progress** (pending full E2E + migration 000010 on dev) | B1-01 waitlist CustomerPicker; B1-02 schedule add shift; B1-03 walk-in queue; B1-04 ownership transfer UI + API audit; B1-05 offboard wizard + API; B1-06 seat-rental staff_id in CRUD; B1-07 chair util + org target migration; B1-08 scorecards SQL metrics; `barber-floor-ops.spec.ts` | B1-01b waitlist→booking; B1-03b queue ETA; B1-04b at-risk on offboard; B1-06b occupancy %; org settings UI for target/chairs; full E2E stack run | Go `build ./...` blocked on disk space in prior session |
| 2 | **Complete** (stub-hardened; live Pesapal/OpenFloat deferred) | B2-01 payment_intents + honest stub IPN; B2-02 tip at POS → tips + ledger `RecordTip` + my-earnings; B2-03 commission_lines + reverse UI; B2-04 MinIO receipt upload; B2-05 P&L + expenses CSV; B2-06 reconciliation module + page gated `pos_payments`; B2-07 OpenFloat honest stub + Confirm UI; FE/API feature gates on finance/payouts; `money-loop.spec.ts` | Live Pesapal sandbox wiring; POS card path still records manual completed sales (labelled honestly); P&L CSV export | Migration `000011` applied via docker migrate on stack up |
| 3 | **Complete** | B3-01–B3-06 + migrations `000012`/`000013`; `phase3-hr.spec.ts` green | — | — |
| 4 | **Complete** | B4-01–B4-05 SMS/WA dry-run + campaign send + gallery upload + review job + WhatsApp nav; `phase4-growth.spec.ts` green | Live AT/Meta creds for production | — |
| 5 | **Complete** | B5-01 deposits + cancellation policy; B5-02 service buffers; B5-03 POS manager PIN + open tabs; B5-04 client merge/tags/photos; B5-05 stock-take + PO (`/inventory/stock-take`, `/inventory/purchase-orders`); B5-06 revenue forecast; B5-07 enquiry desk (inbox + convert-to-booking); migrations `000014`–`000017`; `phase5-advanced.spec.ts` + `phase5-pos-crm.spec.ts` + `phase5-inventory-enquiry.spec.ts` | Full E2E stack run deferred | — |

---

## Explicitly out of scope (do not ticket)

Field-ops GPS, clinical SOAP, telehealth, products storefront-as-primary, finance OCR, multi-currency theatre, bulk command-palette Gap-UI port.
