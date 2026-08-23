# Haus of Beauty · Haus of Spa — Full-Depth Feature-Parity Audit

**Date:** 2026-08-06  
**Scope:** Independent re-audit of beauty + spa in charm2 vs `../barber-house-charm` prototype, matching the rigor of `docs/AUDIT.md` (six-mode audit).  
**Method:** Diff `BEAUTY_NAV` / `SPA_NAV` (prototype `AppLayout.tsx`) → charm2 `nav/{beauty,spa}.json`; re-verify every claim in the earlier `docs/haus-of-{beauty,spa}-audit-and-plan.md` plans (treat those as checklists, not truth); inventory Implemented / Partial / Missing / Broken; flag cross-mode inheritance from beauty/spa → six modes and back-port opportunities.  
**Prototype refs:** `BEAUTY_NAV` (AppLayout.tsx ~95–163), `SPA_NAV` (~165–219), `MODE_TERMS` beauty/spa (`useBusinessCategory.tsx`), `BEAUTY_CATEGORIES` / `SPA_CATEGORIES` (`serviceCategories.ts`).  
**Prior plans (re-verify only):** `docs/haus-of-beauty-audit-and-plan.md`, `docs/haus-of-spa-audit-and-plan.md`, `docs/beauty-production-checklist.md`, `docs/spa-production-checklist.md`.

Status legend: ✅ Implemented · ◐ Partial · ✗ Missing · ⛔ Broken

---

## 1. Executive summary

### 1.1 Gap counts


| Mode | P1 (blocks / wrong entitlement) | P2 (degrades UX / parity) | P3 (nice-to-have) | Total | Headline |
|------|----------------------------------|---------------------------|-------------------|-------|----------|
| Beauty (`beauty`) | 1 | 7 | 4 | **12** | Core + differentiators shipped; **Before & After** nav promise lags nails/clinic pairing; residual gate/title drift |
| Spa (`spa`) | 2 | 8 | 3 | **13** | Rooms/notes/aftercare real; **Payroll + Reconciliation nav keys wrong**; spa copy/titles still therapy-/seat-skewed |
| **Cross-mode inherited** | 1 | 2 | 0 | **3** | Ungated waitlist/gallery patterns copied into nails (and barber); clinic already fixed gallery gate |
| **Total (mode-local + shared)** | **4** | **17** | **7** | **28** | |


### 1.2 What's already solid

- **Nav supersets of prototype:** beauty 70 items / 56 paths (proto 58 / 45); spa 78 / 58 (proto 44 / 33). Same section names. Prototype leftovers `/payments-demo` + `/field-operations` **removed** (nav-truth E2E asserts hidden).
- **Terms + themes:** `mode-terms.json` beauty/spa match prototype `MODE_TERMS` 1:1; `.theme-beauty` / `.theme-spa` present.
- **Taxonomy:** `BEAUTY_SERVICE_CATEGORIES` exact; `SPA_SERVICE_CATEGORIES` same 15 keys (order differs — non-blocking).
- **Seeds:** `beauty-demo-salon`, `spa-demo-wellness` on `professional` with staff, services (patch-test flag on beauty colour), allergies, consent templates, loyalty, packages; spa seeds **8 resources** + resource-bound booking.
- **E2E wired:** `beauty-{nav-truth,floor-ops,growth,advanced}`, `spa-{nav-truth,floor-ops,growth,advanced}` in `playwright.config.ts` — **contradicts** prior plans' "E2E deferred / Done" tracker.
- **Differentiators live (not analytics proxies):** beauty patch tests + consultations + allergy badge/booking warn; spa rooms (`resource_booking`), session notes, progress CRUD, aftercare.
- **Floor/HR depth:** queue, waitlist, time-off, shift-swap, deposits, POS tabs, CRM extras, inventory suite — present in nav (beauty/spa **ahead of prototype** spa thinness by design).

### 1.3 Prior-plan re-verification (checklist → truth)


| Prior claim | Verdict |
|-------------|---------|
| HB0–HB4 / HS0–HS4 all "Done", E2E deferred | **Half-wrong:** implementation largely shipped; E2E **is** wired (not deferred). Tracker stale. |
| Stubs still in beauty/spa nav | **Closed** — removed; specs green. |
| Seat-rental wrong key (`multi_branch`) | **Closed** for beauty/spa — both use `staff_commissions_payroll`. |
| No beauty/spa seed | **Closed**. |
| Session notes / progress / resources / aftercare = Analytics proxies | **Closed** for spa — real modules + `spa-advanced` E2E. |
| Beauty allergy / patch / consultation missing | **Closed** (mig `000018`, CRM APIs, pages, booking warnings). |
| Spa rooms missing | **Closed** (mig `000019`, seed, BookingWizard room step). |
| Gate drift "everywhere" | **Mostly closed** — denser gates than prototype; **residual** spa payroll/reconciliation + ungated waitlist/gallery. |
| HB4-05 / HS4-05 full smoke open | Still a **process** item (full suite runs exist per-spec; no single umbrella smoke job claimed here). |

### 1.4 Overall risk areas

1. **Spa entitlement bugs in nav** — `/payroll` gated `payroll` (enterprise-only leaf) while page/API use `staff_commissions_payroll`; `/reconciliation` gated `inventory_tracking` while API/beauty use `pos_payments`. Professional spa demo can hide payroll or mis-show reconciliation.
2. **Beauty gallery behind nails/clinic** — Phase 5 pairing (`after_image_url` + slot upload) enabled only for `nail_bar` \| `clinic`; beauty nav still says "Before & After Gallery".
3. **Title/shell drift** — dashboard `AppShell` uses `terms.servicesPageTitle` ("Beauty Services" / "Treatments & Services") instead of Salon/Wellness Dashboard; spa Guests→Clients; Seat Rental vs Station/Room; Consent & Allergies → Consent Forms; progress copy says "therapy clients".
4. **Cross-mode inheritance** — ungated `/waitlist` (beauty → nails) and ungated `/gallery` (beauty/spa/barber → nails); clinic correctly uses `marketing` on gallery — back-port that pattern.

---

## 2. Per-mode detailed audits

### 2.1 Beauty (`beauty` · Haus of Beauty · theme-beauty)

**Prototype surface:** `BEAUTY_NAV` = 58 items / 45 unique paths / 9 sections. Feature keys sparse (7). Terms: Stylist · Client · Appointment · Station. Taxonomy 11 categories. Differentiators mostly shared pages + consent/gallery/packages/retail/consumption.

**Charm2:** `nav/beauty.json` = 70 / 56. Added floor/HR/CRM/inventory paths; denser gates (21 keys). Stubs removed.

**Inventory (high-signal paths):**


| Item | Path | Status | Note |
|------|------|--------|------|
| Salon / Station / My Dashboard | `/dashboard` | ◐ | Shared exec metrics; shell title = `servicesPageTitle` (wrong); subtitle OK |
| Locations | `/branches` | ✅ | Gated `multi_branch` |
| Reports / Finance / Commissions / Payroll | — | ✅ | Payroll gate `staff_commissions_payroll` (correct) |
| Audit / QR / Scorecards / Haus Connect / Forecast | — | ✅ | Analytics features gated |
| Today's Schedule / Appointments | `/schedule`, `/bookings` | ✅ | Terms + consultation dialog on complete |
| Walk-in Queue / Queue Manager | `/queue` | ✅ | Create + kanban advance; `queue` |
| Waitlist | `/waitlist` | ◐ | Works + CustomerPicker; **nav ungated** (page `bookings`) |
| Clients / Check-in | `/clients` | ✅ | Allergy badge |
| POS / Open Tabs | `/pos`, `/pos/tabs` | ✅ | `pos_payments` |
| Stylist Time Off / Shift Swap / Onboarding | — | ✅ | In nav + gated |
| Booking Deposits | `/booking-deposits` | ✅ | |
| Client tags / merge / photos / patch tests / consultations | — | ✅ | Beauty differentiators |
| Beauty Services | `/services` | ✅ | `BEAUTY_*` categories + `requires_patch_test` |
| Staff directory | `/staff` | ✅ | Terms → Stylist |
| Loyalty / Packages / Gift Cards / Marketing | — | ✅ | Gated |
| Before & After Gallery | `/gallery` | ◐ | CRUD + upload; **title "Gallery"**; **no before/after pairing** (nails/clinic have it); nav **ungated** vs page `marketing` |
| Consent Forms | `/consent-forms` | ✅ | Beauty types + `clinical`; title matches nav |
| Tips / Retail / Consumption / Inventory / Stock-take / POs | — | ✅ | |
| Station Rental | `/seat-rental` | ◐ | Works; page title **"Seat Rental"** |
| Team Chat / Notifications / Settings / Support | — | ✅ | |
| Payments Demo / Field Operations | — | ✅ | Absent from nav |
| Beauty seed / E2E | — | ✅ | Seed + 4 specs |


**Prior G3 items re-checked:** allergy tracking ✅; prep/buffer ✅; patch tests ✅; consultations ✅; specialties = category field (no matching UI) ◐; treatment rooms ✗ (intentional out-of-scope for beauty in prior plan).

---

### 2.2 Spa (`spa` · Haus of Spa · theme-spa)

**Prototype surface:** `SPA_NAV` = 44 / 33 / 9 sections. Only 4 feature keys. Thinner than beauty (no waitlist/queue/inventory in proto). Terms: Therapist · Guest · Session · Room.

**Charm2:** deliberate **superset** (78 / 58) — prior plan correctly treated prototype thinness as under-scoped. Resources, session notes, aftercare, progress, floor/inventory/growth added.

**Inventory (high-signal + spa differentiators):**


| Item | Path | Status | Note |
|------|------|--------|------|
| Wellness / Spa / My Dashboard | `/dashboard` | ◐ | Shared exec; shell title wrong (`Treatments & Services`) |
| Treatment Rooms | `/resources` | ✅ | Seeded rooms; `resource_booking`; BookingWizard room step |
| Sessions / Therapist Scheduling | `/bookings`, `/schedule` | ✅ | E2E asserts Sessions |
| Walk-in Queue / Waitlist | `/queue`, `/waitlist` | ✅ | Waitlist correctly gated `bookings` |
| Guests / Guest Check-in | `/clients` | ◐ | Page hardcodes **"Clients"** |
| Session Billing (POS) / Open Tabs | `/pos`, `/pos/tabs` | ✅ | Title stays "POS" (therapy got Session Billing — spa does not) |
| Session Notes | `/session-notes` | ✅ | Real CRUD; spa field model when not therapy |
| Progress Tracking | `/progress-tracking` | ◐ | CRUD works; description **"therapy clients"** |
| Aftercare | `/aftercare` | ✅ | `clinical` |
| Consent & Allergies | `/consent-forms` | ◐ | Spa form types exist; page title **"Consent Forms"** ≠ nav |
| Ambience Gallery | `/gallery` | ◐ | Single-image OK for ambience; title still **"Gallery"**; ungated vs `marketing` |
| Therapists / Directory | `/staff` | ✅ | |
| Treatments & Services | `/services` | ✅ | SPA categories |
| Loyalty / Packages / Gift Cards / Reviews / Tips | — | ✅ | |
| Promotions / Referrals | — | ✅ | Nav uses leaf `promotions`/`referrals` (beauty uses parent `promotions_referrals`) — both resolve if parent on |
| Payroll | `/payroll` | ⛔ | Nav `requiredFeature: "payroll"` (enterprise); page/API `staff_commissions_payroll` |
| Reconciliation | `/reconciliation` | ⛔ | Nav `inventory_tracking`; beauty/API `pos_payments` |
| Room Rental | `/seat-rental` | ◐ | Title "Seat Rental" |
| Inventory suite / Marketing / WhatsApp / QR | — | ✅ | |
| Payments Demo / Field Ops | — | ✅ | Absent |
| Spa seed / E2E | — | ✅ | Seed + 4 specs; **no gallery seed rows** |


---

## 3. Feature-gate mismatch register


| Mode | Path | Nav `requiredFeature` | Page / API gate | Severity | Notes |
|------|------|----------------------|-----------------|----------|-------|
| **Spa** | `/payroll` | `payroll` | `staff_commissions_payroll` | **P1** | Enterprise leaf hides item on professional spa demo |
| **Spa** | `/reconciliation` | `inventory_tracking` | `pos_payments` | **P1** | Wrong domain key; beauty/barber/products correct |
| Beauty | `/waitlist` | *(none)* | `bookings` | P2 | Shows when bookings off |
| Beauty | `/gallery` (×2 entries) | *(none)* | `marketing` | P2 | Same pattern spa My Room + Growth gallery |
| Spa | `/gallery` (×2) | *(none)* | `marketing` | P2 | |
| Beauty/Spa | `/seat-rental` | `staff_commissions_payroll` | same | OK | Prior wrong-key claim **closed** |
| Spa | `/promotions`, `/referrals` | leaf keys | leaf + parent dependsOn | OK* | Inconsistent with beauty parent key; not broken if parent enabled |
| Beauty | `/queue` | `queue` | page `queue`; API via `bookings` | OK* | Acceptable; queue feature is UI entitlement |
| Cross | nails `/waitlist` | *(none)* | `bookings` | P2 | **Inherited** beauty HB1 pattern |
| Cross | nails `/gallery` | *(none)* | `marketing` | P2 | **Inherited**; clinic correctly uses `marketing` |
| Cross | barber `/waitlist`, `/gallery` | *(none)* | page gates | P2 | Same family; not beauty-only |


---

## 4. Hardcoded / stub index


| Item | Beauty | Spa | Action |
|------|--------|-----|--------|
| `/payments-demo` | Absent | Absent | Keep out |
| `/field-operations` | Absent | Absent | Keep out |
| Analytics proxy clinical pages | N/A | Replaced by real modules | None |
| Dashboard shell title | Uses `servicesPageTitle` | Same | Relabel |
| `clients/page.tsx` title | "Clients" (OK for beauty) | Should be Guests for spa | Mode title |
| `seat-rental` ModulePage title | "Seat Rental" | Same | Station/Room via terms |
| `galleryTitle()` | Generic "Gallery" | Same | Before & After / Ambience |
| `progress-tracking` description | N/A in nav | "therapy clients" | Spa/therapy-aware copy |
| Seed role keys `senior_barber` | Yes | Yes | Intentional (labels via terms) |
| Gallery demo rows in seed | ✗ | ✗ | Optional seed polish |
| Package checkout in POS | Shared: "not supported yet" | Shared | Enhancement / shared gap |


---

## 5. Cross-mode inheritance matrix

Beauty/spa were the **reference pattern** for the six-mode build. This table asks: does a beauty/spa gap also exist elsewhere, or did a later mode already fix something beauty/spa still lack?


| Pattern / bug | Beauty | Spa | Six-mode status | Classification |
|---------------|--------|-----|-----------------|----------------|
| Stubs payments-demo / field-ops removed | ✅ | ✅ | Phase 0 closed for six | Closed |
| Floor paths (queue, deposits, time-off, tabs) | ✅ | ✅ | Nails got in Phase 5; others vary | Beauty/spa still the gold floor |
| `*-nav-truth` + `*-floor-ops` E2E | ✅ (+ growth/advanced) | ✅ | Six have nav-truth + floor-ops; growth deferred | Six **lag** beauty/spa on growth/advanced depth |
| Seeds per mode | ✅ | ✅ | Six seeded in Phase 1 | Closed |
| Gallery `requiredFeature: marketing` | ✗ ungated | ✗ ungated | Clinic ✅ gated; nails/barber ungated | **Cross-mode gap** — back-port clinic pattern to beauty/spa/nails/barber |
| Waitlist gated `bookings` | ✗ ungated | ✅ gated | Nails ungated (copied beauty) | **Cross-mode gap** — beauty + nails; spa is correct source |
| Gallery before/after pairing | ✗ (nav claims B&A) | N/A ambience | Nails + clinic ✅ Phase 5 | **Back-port into beauty** from nails/clinic |
| Mode-aware page titles | Partial (consent OK) | Weak | Therapy titles Phase 5; nails gallery title | **Back-port** gallery/consent/clients/seat titles into beauty/spa |
| Wrong payroll nav key | ✅ correct | ⛔ `payroll` | products/mobile/beauty/barber correct | **Spa-local** (do not copy spa; fix spa to match beauty) |
| Wrong reconciliation nav key | ✅ `pos_payments` | ⛔ `inventory_tracking` | barber/products correct | **Spa-local** |
| Dedicated mode dashboard | Shared exec | Shared exec | Solo/mobile/products have branches | Optional; six did **not** inherit a beauty dashboard (none existed) |
| Progress copy therapy-skew | — | ◐ | Therapy shares page | Spa + therapy shared copy bug |
| Allergy / patch / consult | ✅ | Reuses allergy | Nails can reuse patch flag (enhancement) | Beauty is source of truth |
| Resources / session notes | — | ✅ | Therapy notes; clinic aftercare | Spa is source; therapy should not regress to proxies |


---

## 6. Gaps — broken, stubbed, orphaned, or missing vs prototype

Objective, testable, ranked. Partial counts as gap. Usability friction is **§7**, not here. Net-new ideas are **§8**.

### 6.1 Beauty gaps

- **P1-B1** Nav promises "Before & After Gallery" but pairing UX is single-image only — nails/clinic already ship `after_image_url` + slot upload (`gallery/page.tsx` `pairingModes`). Broken relative to current platform standard + nav label.  
- **P2-B2** `/gallery` ungated in nav vs page/API `marketing` (×2 entries: Growth + My Station).  
- **P2-B3** `/waitlist` ungated vs page `bookings`.  
- **P2-B4** Dashboard `AppShell` title = `terms.servicesPageTitle` ("Beauty Services") ≠ "Salon Dashboard".  
- **P2-B5** Gallery page title still "Gallery" ≠ "Before & After Gallery".  
- **P2-B6** Station Rental nav vs page "Seat Rental".  
- **P2-B7** Duplicate gallery nav entries (Growth + My Station) without role-differentiated UX.  
- **P3-B8** No beauty gallery rows in seed.  
- **P3-B9** No stylist↔service specialty matching UI (category field only).  
- **P3-B10** Soft title: "Stylist Time Off" nav → page "Time Off".  
- **P3-B11** Optional salon-floor dashboard (not in prototype; six modes didn't require it for beauty).

### 6.2 Spa gaps

- **P1-S1** `/payroll` nav `requiredFeature: "payroll"` — wrong key; use `staff_commissions_payroll` (beauty/products/mobile). Blocks payroll visibility on professional spa.  
- **P1-S2** `/reconciliation` nav `inventory_tracking` — wrong key; use `pos_payments` (beauty/barber/products).  
- **P2-S3** `/gallery` ungated vs `marketing`.  
- **P2-S4** Dashboard shell title ≠ "Wellness Dashboard".  
- **P2-S5** Gallery title ≠ "Ambience Gallery".  
- **P2-S6** Consent page title ≠ "Consent & Allergies".  
- **P2-S7** Clients page title ≠ "Guests".  
- **P2-S8** Room Rental nav vs "Seat Rental" page.  
- **P2-S9** Progress Tracking description hardcodes "therapy clients".  
- **P2-S10** SPA category **order** differs from prototype (same keys) — low risk, still a drift.  
- **P3-S11** No ambience gallery seed rows.  
- **P3-S12** Soft titles (Therapist Time Off → Time Off).  
- **P3-S13** Optional spa-floor dashboard.

### 6.3 Cross-mode gaps (inherited from beauty/spa patterns)

- **P1-X1** *(none that hard-break six modes uniquely from beauty)* — spa payroll/reconciliation did **not** propagate (six copied beauty's correct keys).  
- **P2-X2** Ungated `/gallery` on beauty, spa, barber, nails — clinic already correct (`marketing`). Back-port clinic.  
- **P2-X3** Ungated `/waitlist` on beauty, nails, barber — spa correct (`bookings`). Back-port spa.

---

## 7. Usability / efficiency review

Technically complete flows that still cost clicks on the floor. Ranked by role impact.

### 7.1 Reception / Front Desk

| Friction | Why it hurts | Modes |
|----------|--------------|-------|
| Walk-in = CustomerPicker + staff + service + submit, then kanban advance | Fast lanes want name/phone → chair in ≤2 taps; current form is correct but heavy mid-rush | Beauty + spa |
| No queue → POS one-tap | After "Done", cashier still navigates `/pos` and re-finds the booking | Both |
| Waitlist and Queue are separate destinations | Mental model: one "who's next" board; two sidebar items + two pages | Both (spa especially — Waitlist + Walk-in Queue on Spa Floor) |
| Booking wizard still multi-step for appointments | Fine for pre-book; overkill if reception starts from queue | Both |
| Spa room step in wizard | Correct for couples/sauna; adds a step every session when `resource_booking` on — no "default room" sticky | Spa |
| Portal switcher to see manager floor links | CEO testing floor must flip portal; easy to forget | Both |

### 7.2 Stylist / Therapist (My Station / My Room)

| Friction | Why it hurts | Modes |
|----------|--------------|-------|
| Patch-test warning only on booking **confirm** step | Late discovery; stylist already picked chemical service | Beauty |
| Consultation dialog after complete is optional extra modal | Easy to skip; no forced "note or skip" habit | Beauty |
| Session notes live on a separate nav page | Therapist finishes session → leaves board → Session Notes → pick client | Spa |
| Progress Tracking separate from notes | Two places for "how is this guest doing" | Spa |
| Gallery upload = create row, then secondary upload panel + slot | Two-phase media; pairing missing on beauty makes B&A worse | Beauty (spa ambience less so) |
| My Station gallery vs Growth gallery | Same page, two links — clutter for seniors | Both |

### 7.3 Manager / Executive

| Friction | Why it hurts | Modes |
|----------|--------------|-------|
| Shared exec dashboard | Revenue tiles OK; no "today's chairs / rooms / walk-ins / patch due" strip | Both (solo/mobile/products already branched) |
| Spa Payroll missing from sidebar on professional | Looks like product regression after HS1 | Spa **P1** |
| Dense sidebar (70–78 items) | Power users hunt; no favorites / pinned floor set | Both |
| Inventory + POS reconciliation split | Manager may open wrong "close of day" path; spa gate bug amplifies | Spa |

### 7.4 Click-count sketches (current vs ideal)

| Job | Current (approx) | Ideal floor target |
|-----|------------------|--------------------|
| Walk-in → in chair | Search client → select → staff → service → submit → (later) advance column (~6–8) | Search/create → assign → done (~3) |
| Complete → take payment | Complete on bookings/queue → nav POS → load booking → pay (~5–7) | Complete & Pay on same row (~2) |
| Log spa session note | Navigate Session Notes → add → pick guest/booking → save (~5) | Note sheet on session complete (~2) |
| Beauty B&A photo | Add gallery row → save → select row → upload before → upload after (~8+) | Add pair → two uploads in one dialog (~4) |

---

## 8. Enhancement backlog (optional — not gap-fill)

Do **not** mix into gap phases.

**Beauty**

- One-tap Complete & Pay from queue/bookings.  
- Sticky "rush mode" walk-in (last staff/service defaults).  
- Specialty matching rank in booking staff picker.  
- Patch-test due date calendar / SMS reminder.  
- Client photo timeline tied to consultations.  
- Salon-floor dashboard (today's appointments, walk-ins, patch warnings, retail attach rate).  
- Public booking: patch-test questionnaire step for chemical services.

**Spa**

- Default room sticky per therapist; couples auto-pick capacity ≥2.  
- Session-complete sheet: note + aftercare template + next booking.  
- Guest-facing mood/check-in (prototype orphan — only if product wants).  
- Sauna/steam time-block calendar distinct from massage rooms.  
- Therapist utilization vs room utilization widget.  
- WhatsApp "your room is ready" walk-in ping.

**Shared (beauty + spa)**

- POS package-line checkout (currently blocked in `PosWorkspace`).  
- Sidebar favorites / role-compressed "Floor" preset.  
- Command palette synonyms (Guest = Client, Session = Appointment).  
- Soften dual gallery links into one item with role filter.

---

## 9. Phase-by-phase plan

Ordering: entitlement truth → title/pairing back-ports → cross-mode gate sync → optional UX. Effort: S < M < L.

### Phase 0 — Entitlement truth (spa-first)

**Scope:**

- Fix spa `/payroll` → `staff_commissions_payroll` (P1-S1).  
- Fix spa `/reconciliation` → `pos_payments` (P1-S2).  
- Gate beauty `/waitlist` with `bookings` (P2-B3).  
- Gate beauty + spa `/gallery` with `marketing` (P2-B2, P2-S3).  

**Dependencies:** none. **Effort:** S.  
**Done when:** professional spa demo shows Payroll; reconciliation appears iff `pos_payments`; gallery/waitlist disappear when features off; spa-nav-truth still green.

### Phase 1 — Title + gallery back-port

**Scope:**

- Enable beauty in `pairingModes` + `galleryTitle` → "Before & After Gallery"; spa title → "Ambience Gallery" (P1-B1, P2-B5, P2-S5).  
- Dashboard shell title: use mode dashboard label / terms (not `servicesPageTitle`) (P2-B4, P2-S4).  
- Spa clients title Guests; consent "Consent & Allergies"; seat-rental Station/Room via terms (P2-S6–S8, P2-B6).  
- Progress description mode-aware (P2-S9).  

**Dependencies:** Phase 0 optional. **Effort:** M.  
**Done when:** beauty-growth/spa-growth (or new asserts) see matching headings; beauty gallery shows before/after slot like nails.

### Phase 2 — Cross-mode gate sync

**Scope:**

- Apply `marketing` on gallery + `bookings` on waitlist for **nails** and **barber** (P2-X2, P2-X3).  
- Confirm clinic remains correct; therapy N/A.  

**Dependencies:** Phase 0 pattern. **Effort:** S.  
**Done when:** nav-truth still green; features off → items hidden in affected modes.

### Phase 3 — Floor efficiency (optional product)

**Scope:**

- Queue/bookings Complete & Pay shortcut; session-complete note sheet (spa); reduce dual gallery nav clutter (P2-B7 + §7).  
- Seed gallery rows beauty/spa (P3-B8, P3-S11).  

**Dependencies:** Phase 1 for gallery UX. **Effort:** L.  
**Done when:** floor-ops E2E covers new shortcuts; click-count targets in §7.4 measurably down.

**Suggested sequencing:** 0 → 1 → 2 → (3 optional). Phase 2 can parallel Phase 1 after Phase 0 lands.

---

## 10. Source notes


| Topic | Path |
|-------|------|
| Prototype BEAUTY_NAV / SPA_NAV | `../barber-house-charm/src/components/AppLayout.tsx` |
| Prototype MODE_TERMS / categories | `../barber-house-charm/src/hooks/useBusinessCategory.tsx`, `serviceCategories.ts` |
| Charm2 navs | `packages/contracts/domain/nav/{beauty,spa}.json` |
| Terms / taxonomy | `packages/contracts/domain/mode-terms.json`, `apps/web/lib/mode-crud-configs.ts` |
| Seeds | `apps/api/cmd/seed/{beauty,spa}.go` |
| Gallery pairing | `apps/web/app/(dashboard)/gallery/page.tsx` |
| Dashboard branches | `apps/web/app/(dashboard)/dashboard/page.tsx` |
| Prior plans (stale tracker) | `docs/haus-of-{beauty,spa}-audit-and-plan.md` |
| Six-mode audit | `docs/AUDIT.md` |
| E2E wiring | `apps/web/playwright.config.ts` ~flows testMatch |
| Features registry | `packages/contracts/domain/features.json` (`payroll` vs `staff_commissions_payroll`) |

---

*End of audit. Gaps (§6), usability (§7), and enhancement backlog (§8) are intentionally non-overlapping.*
