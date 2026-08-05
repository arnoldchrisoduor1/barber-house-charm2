# Haus of Beauty — Audit & Phased Implementation Plan

**Mode:** `beauty` · **Brand:** Haus of Beauty · **Theme:** `theme-beauty` (pink)  
**Terms:** Stylist · Client · Appointment · Station · "Salon Dashboard"  
**Audit date:** 2026-08-04  
**Reference audit for barber:** [haus-of-barber-audit.md](./haus-of-barber-audit.md)  
**Barber plan (reuse model):** [barber-phased-implementation-plan.md](./barber-phased-implementation-plan.md)

---

## Executive summary

Beauty mode is a **re-skin of the shared salon platform** — same Go API, same Next.js pages, same DB schema — differentiated only by nav manifest (`beauty.json`), mode terms (Stylist / Station / Appointment), and `theme-beauty` CSS class. This is correct architecture. The problem is that `beauty.json` **never received the same hardening the barber nav got through Phases 0–5**. The result:

- Stubs (`/payments-demo`, `/field-operations`) still in sidebar
- Feature gates inconsistent (9 nav items ungated that should be gated)
- Station Rental gated on wrong key
- Walk-in Queue, HR ops, booking deposits, and all Phase-5 CRM tools absent from beauty nav despite being live in the API
- Zero beauty E2E tests; no beauty org in demo seed
- Beauty-specific differentiators (consent forms, allergy tracking, service buffers, treatment packages, consumption recipes, client specialties) partially wired but not surfaced to the right gates or roles

**Verdict by category:**

| Area | Status |
|------|--------|
| Mode infrastructure (terms, theme, nav routing) | ✅ Complete |
| Core ops (bookings, schedule, staff, CRM, POS) | ✅ Working via shared pages |
| Nav truth (no stubs, correct gates) | ❌ Needs Phase H0 cleanup |
| Salon floor completeness (queue, HR ops, deposits) | ❌ Missing from nav |
| Beauty-specific features (consent, allergy, buffers, specialties, recipes) | ⚠️ Partial — need surface + gates |
| E2E test coverage | ❌ Zero |
| Beauty demo seed | ❌ Missing (seed is barber-only) |

---

## Part 1 — Current state inventory

### 1.1 Nav manifest (`packages/contracts/domain/nav/beauty.json`)

58 items · 45 unique paths · 9 sections. Every path has a corresponding `page.tsx` (no 404 orphans).

**Sections:** Executive · Salon Floor · Reception · My Station · Services · Sales · Growth · Operations · System

#### Gate drift table (beauty nav vs page/API reality)

| Path | Beauty nav gate | Page/API gate | Issue |
|------|-----------------|---------------|-------|
| `/loyalty` | *(none)* | `loyalty` | Under-gated |
| `/packages` | *(none)* | `marketing` | Under-gated |
| `/gift-cards` | *(none)* | `marketing` | Under-gated |
| `/marketing` | *(none)* | `marketing` | Under-gated |
| `/tips` | *(none)* | `tips_management` | Under-gated |
| `/qr-attendance` | *(none)* | `qr_clock` | Under-gated |
| `/qr-clock` | *(none)* | `qr_clock` | Under-gated |
| `/reviews` | *(none)* | `customer_reviews` | Under-gated |
| `/my-earnings` | *(none)* | `staff_commissions_payroll` | Under-gated |
| `/scorecards` | *(none)* | `advanced_analytics` | Under-gated |
| `/call-centre` | *(none)* | `advanced_analytics` | Under-gated |
| `/revenue-forecast` | *(none)* | `advanced_analytics` | Under-gated |
| `/retail-products` | *(none)* | `inventory_tracking` | Under-gated |
| `/branches` | *(none)* | `multi_branch` (barber) | Under-gated |
| `/seat-rental` | `multi_branch` | `staff_commissions_payroll` (page/API) | **Wrong key** |
| `/consent-forms` | *(none)* | `clinical` (page/API) | Under-gated + wrong mode fit |
| `/gallery` | *(none)* | *(none on page)* | Fine as-is |
| `/payments-demo` | *(none)* | N/A (UI stub) | **Should be removed** |
| `/field-operations` | *(none)* | `coverage_zones` (mobile) | **Wrong mode — remove** |

#### Missing from beauty nav (pages + APIs are live)

| Path | Feature key | Description |
|------|-------------|-------------|
| `/queue` | `queue` | Walk-in queue board |
| `/time-off` | `staff_time_off` | Stylist leave requests + manager approval |
| `/shift-swap` | `staff_shift_swap` | Stylist shift trades |
| `/onboarding-checklist` | `staff_onboarding` | New-hire checklists |
| `/booking-deposits` | `booking_deposits` | Deposit policy + cancellation fees |
| `/pos/tabs` | `pos_payments` | Open tabs at POS |
| `/client-tags` | `crm` | Client segmentation tags |
| `/clients/merge` | `crm` | Duplicate client merge |
| `/client-photos` | `crm` | Before/after photo timeline per client |
| `/inventory/stock-take` | `inventory_tracking` | Physical count + stock adjustment |
| `/inventory/purchase-orders` | `inventory_tracking` | PO lifecycle → receive → increment stock |

---

### 1.2 Web pages (beauty perspective)

All 45 nav paths resolve to real pages. Pages are **shared** with barber; beauty differences are:
- Labels via `useBusinessCategory().terms` ("Stylist", "Appointment", "Station", "Beauty Services")
- Theme via `theme-beauty` CSS class (pink primary)
- Brand via `terms.label` = "Haus of Beauty"

**Copy leftovers that need fixing:**

| Page | Barber copy | Beauty fix |
|------|-------------|------------|
| `/payments-demo` | "Haircut + beard trim" | Remove from nav |
| `/client-ownership` | "Select barber" | Already uses terms? Verify |
| `/seat-rental` | "Assigned barber" | Use terms.staffSingular = "Stylist" |
| `/staff` (forms) | Role dropdown shows "Senior Barber" | Show "Senior Stylist" via terms |
| `/consent-forms` | Medical patient framing | Re-frame as salon consent / chemical treatment |

---

### 1.3 API / backend

All API modules are **mode-agnostic** — the same Go handlers serve barber and beauty. This is correct.  
No `beauty`-specific API logic exists (or is needed). Mode is presentation-layer only.

**Relevant modules for beauty flows:**

| Module | Beauty use |
|--------|-----------|
| `booking` | Appointments, waitlist, deposits, walk-in |
| `services` | Beauty service catalog |
| `crm` | Clients, ownership, merge, tags, photos |
| `staff` | Stylist directory, QR attendance, time-off, onboarding, shift swap |
| `pos` | POS, tips, open tabs |
| `payroll` | Commissions, payslips |
| `inventory` | Stock, consumption, suppliers, stock-take, PO |
| `marketing` | Loyalty, packages, gift cards, promotions, referrals, reviews |
| `settings` | Consent forms, gallery, branding, staff chat, enquiry desk |
| `analytics` | Dashboard, scorecards, forecast, call-centre |
| `notifications` | SMS/WA reminders |

---

### 1.4 Beauty-specific differentiators (prototype had these; charm2 is partial)

| Feature | Prototype status | Charm2 status |
|---------|-----------------|---------------|
| Consent forms | ✅ In beauty nav + Supabase tables | ⚠️ Page exists, wrong feature key, no beauty-specific form types |
| Before/after gallery | ✅ In beauty nav | ✅ In beauty nav + real upload API |
| Treatment packages | ✅ In beauty nav (`/packages`) | ✅ In nav, not gated correctly |
| Retail products (skincare) | ✅ In beauty nav | ✅ In nav, not gated correctly |
| Consumption tracking | ✅ In beauty nav | ✅ In nav (gated correctly `inventory_tracking`) |
| Allergy tracking | ⚠️ Prototype: localStorage `allergy_alerts` | ❌ Not in charm2; closest = consent form `allergy` type |
| Service prep/buffer times | ⚠️ Prototype: localStorage buffer rules | ✅ B5-02 built it (DB column + API); **not mentioned in beauty docs** |
| Treatment room / resource allocation | ⚠️ Prototype: localStorage `resources` | ❌ Not in charm2 |
| Client specialties matching | ⚠️ Prototype: `BEAUTY_CATEGORIES` taxonomy | ⚠️ Service category field exists; no staff specialty-to-service matching UI |
| Consultation / client history | ❌ Prototype: only free-text notes | ❌ No dedicated consultation entity |
| Patch test tracking | ❌ Not built anywhere | ❌ Missing |
| Booking deposits (salon: chemical treatments) | ✅ Barber Phase 5 | ⚠️ Built, not in beauty nav |

---

### 1.5 E2E coverage

**Zero beauty-specific tests.** The demo seed (`apps/api/cmd/seed/main.go`) creates a `barber`-type org only.

| What's needed | File |
|---------------|------|
| Beauty org seeded for E2E | `apps/api/cmd/seed/main.go` |
| Beauty nav truth (stubs hidden, gates match) | `e2e/flows/beauty-nav-truth.spec.ts` |
| Beauty floor ops (appointment → payment → commission) | `e2e/flows/beauty-floor-ops.spec.ts` |
| Beauty growth (loyalty, packages, gallery, consent) | `e2e/flows/beauty-growth.spec.ts` |
| Beauty-specific: consent, allergy, buffers | `e2e/flows/beauty-advanced.spec.ts` |

---

## Part 2 — Gap analysis

### G1. Nav stubs and wrong-mode items (HIGH — same as barber Phase 0)

**Remove from beauty nav:**
- `/payments-demo` — UI stub; payment is real POS or nothing
- `/field-operations` — mobile coverage zones; no salon relevance

**Fix feature keys:**
- `/seat-rental` → change `multi_branch` to `staff_commissions_payroll`
- `/consent-forms` → add `requiredFeature: "clinical"` (or introduce `beauty_treatments` key, see §G5)

**Add missing gates (21 items):**
All nav items in the gate drift table above.

### G2. Missing floor completeness (HIGH)

Walk-in Queue, Time Off, Shift Swap, Onboarding Checklist, Booking Deposits, POS Tabs — all fully implemented in the API (barber Phases 1–5), zero presence in beauty nav.

### G3. Beauty-specific depth (MEDIUM)

These differentiate beauty from a generic booking tool:

1. **Allergy tracking** — clients with chemical sensitivities; per-appointment allergy flag
2. **Service-specific prep/buffer times** — already in DB (B5-02); just needs beauty service templates
3. **Consent form versioning** — link consent form to appointment; track signed status per visit
4. **Client specialties/preference matching** — staff specialties array matched to booked service category
5. **Consultation notes** — lightweight per-client treatment history (not full SOAP/clinic)
6. **Patch test tracking** — record patch test date + result on client; block booking if expired

### G4. Copy / role-label drift (LOW-MEDIUM)

Role API names stay as `senior_barber`/`junior_barber` (correct, shared auth). UI forms, invite flow, and settings pages still show "Senior Barber" instead of "Senior Stylist". Mode terms are defined but not consumed everywhere.

### G5. Feature key gaps (MEDIUM)

Beauty needs beauty-flavored feature coverage:
- **`beauty_treatments`** — governs consent form workflows, allergy tracking, patch test records; separates clinical-grade from beauty-grade consent. (Alternative: reuse `clinical` but re-label it for beauty plans.)
- **`consultation_history`** — per-client treatment notes / history timeline.

Or: reuse existing `clinical` key — already in features.json — but unblock it on `professional` plan for beauty.

### G6. No beauty E2E / seed (HIGH)

Playwright tests only run a barber org. Any beauty-only regression will be invisible.

---

## Part 3 — Phased implementation plan

**Ticket ID scheme:** `HB{phase}-{nn}` (HB = Haus of Beauty)  
**Reuse rule:** All Phase 1–5 barber work (API, pages, migrations) is already live. Beauty tickets are mostly **nav wiring, gate fixes, and E2E** — new backend code only for features not yet built.  
**Phase gate:** E2E green before next phase starts.

---

## Phase HB0 — Truth & trust (nav parity with barber Phase 0)

**Goal:** Beauty sidebar tells the truth. Stubs gone. Feature gates match pages and API. Beauty org in seed. Nav-truth E2E green.

**Out of phase:** New beauty-specific features (allergy, patch test, consultation). Floor completeness. Growth depth.

---

### HB0-01 — Remove stubs + fix wrong-mode items from beauty nav

| Field | Content |
|-------|---------|
| **Type** | nav fix |
| **Files** | `packages/contracts/domain/nav/beauty.json` |
| **Current** | `/payments-demo` and `/field-operations` in beauty nav |
| **Target** | Remove both items from `beauty.json`. Payment is real POS or nothing in beauty. Field operations is a mobile coverage-zones surface — irrelevant to a salon. |
| **Test plan** | E2E: beauty nav-truth spec asserts these paths absent from sidebar |
| **Reuse** | Mirrors B0-02 from barber plan |
| **Depends** | None |

---

### HB0-02 — Fix feature gate mismatches in beauty nav

| Field | Content |
|-------|---------|
| **Type** | gate fix |
| **Files** | `packages/contracts/domain/nav/beauty.json`; run `npm run generate:e2e-routes` after |
| **Current** | 16 under-gated items; Station Rental on wrong key (`multi_branch` → should be `staff_commissions_payroll`) |
| **Target** | Add `requiredFeature` to every item in the gate drift table (§1.1). Station Rental: change to `staff_commissions_payroll`. Consent Forms: add `requiredFeature: "clinical"`. |
| **Gate additions:** | |
| `/loyalty` | `loyalty` |
| `/packages`, `/gift-cards`, `/marketing` | `marketing` |
| `/tips` | `tips_management` |
| `/qr-attendance`, `/qr-clock` | `qr_clock` |
| `/reviews` | `customer_reviews` |
| `/my-earnings` | `staff_commissions_payroll` |
| `/scorecards`, `/call-centre`, `/revenue-forecast` | `advanced_analytics` |
| `/retail-products` | `inventory_tracking` |
| `/branches` | `multi_branch` |
| `/seat-rental` | `staff_commissions_payroll` (fix) |
| `/consent-forms` | `clinical` |
| **Test plan** | Integration: API 403 on gated routes without feature. E2E: basic plan org sees only ungated items; professional/enterprise plans unlock progressively. |
| **Reuse** | Mirrors B0-01 from barber plan |
| **Depends** | HB0-01 |

---

### HB0-03 — Seed a beauty org for E2E

| Field | Content |
|-------|---------|
| **Type** | test infrastructure |
| **Files** | `apps/api/cmd/seed/main.go` |
| **Current** | Demo seed creates only `barber` business type org |
| **Target** | Add a second org (`beauty-demo-salon` / `arnoldchris262+beauty@gmail.com` or reuse with separate slug) with `BusinessType: "beauty"`, seeded with: beauty services (braids, facial, lashes, manicure, wax, keratin), beauty staff (3 stylists), demo clients (inc. one with allergy note), sample consent form, loyalty rewards, packages, gallery items. Enable features: `bookings`, `crm`, `loyalty`, `marketing`, `inventory_tracking`, `pos_payments`. |
| **Test plan** | Seed runs without error in Docker stack. E2E setup can auth as beauty org CEO and navigate `/dashboard`. |
| **Depends** | None |

---

### HB0-04 — Regenerate E2E routes + beauty nav-truth spec

| Field | Content |
|-------|---------|
| **Type** | test |
| **Files** | `apps/web/e2e/flows/beauty-nav-truth.spec.ts`; `npm run generate:e2e-routes` |
| **Current** | No beauty E2E; generated routes from shared union only |
| **Target** | After HB0-01/02 + HB0-03, write `beauty-nav-truth.spec.ts`: (1) Auth as beauty CEO; (2) Assert Payments Demo and Field Operations absent from sidebar; (3) Assert gated items (scorecards, POS, etc.) absent without features, present with them; (4) Assert theme-beauty applied (pink accent / "Haus of Beauty" brand). Register in `playwright.config.ts`. |
| **Test plan** | Spec itself is the test plan. Green = done. |
| **Depends** | HB0-01, HB0-02, HB0-03 |

---

### HB0-05 — Fix mode-term copy drift in shared pages

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web/app/(dashboard)/seat-rental/page.tsx`; staff invite forms; `client-ownership/page.tsx`; any hardcoded "barber" strings in shared components |
| **Current** | "Assigned barber", "Select barber", "Senior Barber" in dropdowns/forms even when beauty mode active |
| **Target** | Replace hardcoded barber strings with `terms.staffSingular` / `terms.seniorStaff` / `terms.juniorStaff` from `useBusinessCategory()`. No new logic — just consume existing terms already defined in `mode-terms.json`. |
| **Test plan** | E2E (beauty org): seat-rental page shows "Stylist" not "Barber"; staff invite shows "Senior Stylist"; client-ownership picker shows "Stylist". |
| **Depends** | HB0-03 |

---

## Phase HB1 — Salon floor completeness

**Goal:** Beauty nav has the same operational completeness as post-Phase-1 barber. All floor features accessible. Walk-in, HR ops, deposits, POS tabs in beauty sidebar.

**Approach:** These features are **already fully built** (barber Phases 1–5). Work here is nav wiring + E2E. No new backend code.

---

### HB1-01 — Add Walk-in Queue to beauty nav (Salon Floor)

| Field | Content |
|-------|---------|
| **Type** | nav wiring |
| **Files** | `packages/contracts/domain/nav/beauty.json` |
| **Target** | Add `/queue` to "Salon Floor" section for `branch_manager` and "Reception" for `receptionist`, with `requiredFeature: "queue"`. Label: "Walk-in Queue". |
| **Reuse** | Page `apps/web/app/(dashboard)/queue/page.tsx` already exists and works (barber) |
| **Test plan** | E2E: beauty branch_manager can navigate to Walk-in Queue; add walk-in, advance to in-chair, complete to POS. |
| **Depends** | HB0-03, HB0-04 |

---

### HB1-02 — Add HR operations to beauty nav

| Field | Content |
|-------|---------|
| **Type** | nav wiring |
| **Files** | `packages/contracts/domain/nav/beauty.json` |
| **Target** | Add to Salon Floor / Operations sections: |
| | `/time-off` — `staff_time_off` — "Stylist Time Off" (branch_manager, ceo, director) |
| | `/shift-swap` — `staff_shift_swap` — "Shift Swap" (branch_manager) |
| | `/onboarding-checklist` — `staff_onboarding` — "Onboarding Checklist" (ceo, director, branch_manager) |
| **Reuse** | All three pages built in barber Phase 3 |
| **Test plan** | E2E: beauty manager can submit time-off, approve it, verify booking block. |
| **Depends** | HB0-03, HB0-04 |

---

### HB1-03 — Add booking deposits + POS tabs + CRM extras to beauty nav

| Field | Content |
|-------|---------|
| **Type** | nav wiring |
| **Files** | `packages/contracts/domain/nav/beauty.json` |
| **Target** | Add: |
| | `/booking-deposits` — `booking_deposits` — "Booking Deposits" (ceo, director, branch_manager) |
| | `/pos/tabs` — `pos_payments` — "Open Tabs" (ceo, director, receptionist) |
| | `/client-tags` — `crm` — "Client Tags" (ceo, director, branch_manager) |
| | `/clients/merge` — `crm` — "Merge Clients" (ceo, director) |
| | `/client-photos` — `crm` — "Client Photos" (ceo, director, branch_manager, senior_barber) |
| **Reuse** | All pages built in barber Phase 5 |
| **Test plan** | E2E: beauty CEO can set cancellation fee; receptionist can open a tab at POS; branch manager can tag clients. |
| **Depends** | HB0-03, HB1-01 |

---

### HB1-04 — Add inventory operations to beauty nav

| Field | Content |
|-------|---------|
| **Type** | nav wiring |
| **Files** | `packages/contracts/domain/nav/beauty.json` |
| **Target** | Add (under Sales): |
| | `/inventory/stock-take` — `inventory_tracking` — "Stock Take" |
| | `/inventory/purchase-orders` — `inventory_tracking` — "Purchase Orders" |
| **Reuse** | Both pages built in barber Phase 5 (B5-05) |
| **Test plan** | E2E: beauty CEO can create + finalize a stock take; PO receive increments inventory. |
| **Depends** | HB0-03 |

---

### HB1-05 — Beauty floor ops E2E

| Field | Content |
|-------|---------|
| **Type** | test |
| **Files** | `apps/web/e2e/flows/beauty-floor-ops.spec.ts`; `playwright.config.ts` |
| **Target** | Write and register `beauty-floor-ops.spec.ts` covering: appointment create → advance to in-service → checkout with tip → commission line; walk-in queue if HB1-01 done; stylist time-off blocks booking slot. |
| **Reuse** | Mirrors `barber-floor-ops.spec.ts` with beauty org + Stylist copy assertions |
| **Depends** | HB1-01, HB1-02, HB1-03 |

---

## Phase HB2 — Beauty growth & communications

**Goal:** Growth suite fully wired and tested for beauty. Loyalty, packages, gift cards, gallery, consent forms, marketing campaigns, WhatsApp reviews.

**Note:** Most pages and APIs already exist. Work is gate fixes (HB0-02 covers nav), demo data (HB0-03 covers seed), and E2E.

---

### HB2-01 — Consent forms: fix gate + add beauty form templates

| Field | Content |
|-------|---------|
| **Type** | hardening + content |
| **Files** | `packages/contracts/domain/nav/beauty.json`; `apps/api/cmd/seed/main.go` (beauty consent templates) |
| **Current** | Consent forms use `clinical` key (clinic-oriented). In beauty, chemical treatments (perms, relaxers, waxing) legally require client consent. |
| **Target** | Keep gate as `clinical` (it applies). Add beauty-labeled consent templates to seed: "Chemical Treatment Consent", "Waxing/Facial Consent", "Allergy & Patch Test Declaration". The page already handles CRUD — no new API needed. |
| **Test plan** | E2E: beauty org with `clinical` feature creates a "Chemical Treatment Consent" form; marks it signed for a client. |
| **Depends** | HB0-03 |

---

### HB2-02 — Loyalty, packages, gift cards: verify gate wire-through

| Field | Content |
|-------|---------|
| **Type** | gate verification + E2E |
| **Files** | Gate already fixed in HB0-02. |
| **Target** | Verify that with `marketing` / `loyalty` features off, nav items are hidden and pages gate-block. With features on, full CRUD works. Add beauty-specific demo content (Facial Series package, Braids Loyalty Pack, Gift Card). |
| **Test plan** | E2E: create loyalty reward → assign to client via booking completion (if wired) → package purchase → gift card redemption at POS. |
| **Depends** | HB0-02, HB0-03 |

---

### HB2-03 — Gallery: before/after upload for beauty

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web/app/(dashboard)/gallery/page.tsx`; gallery API |
| **Current** | Gallery is in beauty nav, works, but upload + staff portfolio link untested for beauty stylists. |
| **Target** | Verify gallery upload works under beauty org; stylist (`senior_barber` role) can view their own gallery from My Station → Gallery. Add `gallery` sub-entry to My Station in beauty nav (senior_barber). |
| **Test plan** | E2E: beauty stylist uploads a before/after photo; appears in gallery page with stylist attribution. |
| **Depends** | HB0-03 |

---

### HB2-04 — Growth E2E

| Field | Content |
|-------|---------|
| **Type** | test |
| **Files** | `apps/web/e2e/flows/beauty-growth.spec.ts`; `playwright.config.ts` |
| **Target** | Write `beauty-growth.spec.ts`: loyalty reward created; package purchased; gift card issued; consent form created + signed; marketing campaign created; WhatsApp log visible (feature gated); gallery upload. |
| **Reuse** | Mirrors `phase4-growth.spec.ts` with beauty org |
| **Depends** | HB2-01, HB2-02, HB2-03 |

---

## Phase HB3 — Beauty-specific features

**Goal:** Implement the features that make beauty mode meaningfully different from a generic booking platform: allergy tracking, patch test records, service specialties matching, consultation history, and client-level treatment buffers.

**Backend work required for:** allergy notes (extend client model), patch test tracking (new table), consultation notes (new lightweight table), specialty matching (staff model already has `specialties []string`).

---

### HB3-01 — Client allergy notes + allergy flag on appointments

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | Migration `000018_beauty_allergy`; `apps/api/internal/modules/crm/`; `apps/web/app/(dashboard)/clients/` |
| **Current** | Client model has free-text `notes`. Prototype had localStorage `allergy_alerts` with severity + allergen list. |
| **Target** | Extend `customers` table: add `allergy_notes text`, `has_allergies boolean NOT NULL DEFAULT false`. API: `PUT /organizations/:org/customers/:id` already accepts updates — add field. UI: Clients edit form shows "Allergy notes" textarea + "Has known allergies" toggle under medical section; client list shows 🔴 badge when `has_allergies=true`. Appointment detail shows allergy alert if client has_allergies. |
| **Data model** | `ALTER TABLE customers ADD COLUMN allergy_notes text; ADD COLUMN has_allergies boolean NOT NULL DEFAULT false;` |
| **Feature gate** | `crm` (existing) |
| **Test plan** | E2E: mark client as has_allergies → open appointment for that client → allergy warning visible. |
| **Depends** | HB0-03 |

---

### HB3-02 — Patch test tracking

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | Migration `000018`; `apps/api/internal/modules/crm/`; new page `apps/web/app/(dashboard)/client-patch-tests/page.tsx` |
| **Current** | Not implemented anywhere. Prototype noted it as a beauty differentiator. |
| **Target** | New table `customer_patch_tests` (id, organization_id, customer_id, test_type, performed_at, result: pass/fail/pending, expires_at, notes). API CRUD under `/customers/:id/patch-tests`. UI: per-client patch test log under CRM extras; expire warning (badge) when last test > 6 weeks ago. Service-level flag: service can have `requires_patch_test boolean`. Booking validation: warn (not block) if client has no valid patch test for a `requires_patch_test` service. |
| **Feature gate** | `clinical` |
| **Test plan** | E2E: record patch test → see expiry warning after 6 weeks (mock date) → book chemical service → warning shown. |
| **Depends** | HB3-01 |

---

### HB3-03 — Consultation / treatment notes per client

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | Migration `000018`; `apps/api/internal/modules/crm/`; `apps/web/app/(dashboard)/client-consultations/page.tsx` |
| **Current** | No dedicated consultation entity. Prototype had localStorage session notes. Charm2 has booking notes only. |
| **Target** | New table `client_consultations` (id, organization_id, customer_id, staff_id FK, booking_id FK optional, service_name, treatment_summary, skin_notes, product_used, next_appointment_notes, created_at). API: `GET/POST /organizations/:org/customers/:id/consultations`. UI: `/client-consultations` page (list per customer) + inline form on booking completion page. Stylist can write treatment summary after a service; client timeline shows consultation history. |
| **Feature gate** | New key `consultation_history` (add to features.json, `minPlan: professional`) |
| **Test plan** | E2E: stylist completes booking → writes consultation note → note appears in client profile timeline. |
| **Depends** | HB0-03 |

---

### HB3-04 — Service specialties matching (stylist → service category)

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web/app/(dashboard)/staff/page.tsx`; `apps/web/app/(dashboard)/bookings/page.tsx`; `apps/web/app/(dashboard)/services/page.tsx` |
| **Current** | Staff model has `Specialties []string` column (JSON). Services have `category` text. No matching logic in booking UI. |
| **Target** | Staff edit form: add "Specialties" multi-select using beauty service categories (`braids`, `nails`, `makeup`, `facials`, `waxing`, `lashes`, `skincare`, `colour`, `hair_treatment`, `weaves`). When booking a service with a `category`, the stylist picker filters/sorts by matching specialty. No hard block — just visual priority indicator. Beauty service creation form: `category` shown as enum dropdown instead of free text. |
| **Feature gate** | None (core booking UX) |
| **Test plan** | E2E: staff with specialty "braids" appears first when booking a Braids service. |
| **Depends** | HB0-03 |

---

### HB3-05 — Service buffer defaults for beauty categories

| Field | Content |
|-------|---------|
| **Type** | content / template |
| **Files** | `apps/api/cmd/seed/main.go` (beauty service seed) |
| **Current** | Buffer minutes (B5-02) are implemented on the `services` table (`prep_minutes`, `buffer_minutes`). Beauty services in seed have 0 buffer. |
| **Target** | Beauty service seed templates include sensible defaults: Hair Color/Keratin → 15m prep (foil application) + 10m buffer; Facial → 5m prep (room setup) + 10m buffer; Waxing → 5m cleanup; Braids 0 prep + 10m buffer. These ship as seed defaults; salon can edit. |
| **Feature gate** | N/A — DB columns already exist |
| **Test plan** | Verify slot engine respects buffer when booking consecutive beauty appointments. |
| **Depends** | HB0-03 |

---

### HB3-06 — Add new feature keys + nav entries for HB3 features

| Field | Content |
|-------|---------|
| **Type** | contracts change |
| **Files** | `packages/contracts/domain/features.json`; `packages/contracts/domain/nav/beauty.json`; `npm run generate:e2e-routes` |
| **Target** | Add feature keys: `consultation_history` (minPlan: professional). Add to beauty nav: `/client-patch-tests` under Services (ceo, director, branch_manager, `clinical`); `/client-consultations` under Services (ceo, director, branch_manager, senior_barber, `consultation_history`). |
| **Depends** | HB3-02, HB3-03 |

---

### HB3-07 — Beauty advanced E2E

| Field | Content |
|-------|---------|
| **Type** | test |
| **Files** | `apps/web/e2e/flows/beauty-advanced.spec.ts`; `playwright.config.ts` |
| **Target** | Write `beauty-advanced.spec.ts`: allergy flag on client triggers appointment warning; patch test recorded + expiry badge visible; consultation note added after appointment; specialty matching sorts stylists correctly in booking. |
| **Depends** | HB3-01, HB3-02, HB3-03, HB3-04 |

---

## Phase HB4 — Polish, parity & production readiness

**Goal:** Production-ready. All copy uses mode terms. Role labels correct. Beauty demo seed complete. All E2E green. Known stubs (SMS, payments) clearly labelled or production-wired.

---

### HB4-01 — Role invite + directory labels (Stylist, not Barber)

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | Staff invite page; staff directory forms; any UI that renders role enum as display label |
| **Target** | When businessType is `beauty`: role display = "Senior Stylist" / "Junior Stylist" / "Salon Manager" (from `mode-terms.json` `seniorStaff` / `juniorStaff`). Auth role keys (`senior_barber`, `junior_barber`) stay unchanged server-side. Only presentation label changes via `terms`. |
| **Reuse** | Terms already defined in `mode-terms.json`; just consume them |
| **Test plan** | E2E: invite form shows "Senior Stylist" in beauty mode; staff directory header says "Stylists". |
| **Depends** | HB0-03 |

---

### HB4-02 — Booking flow terms (Appointment not Walk-in Booking)

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web/app/(dashboard)/bookings/page.tsx`; walk-in queue page; schedule page |
| **Target** | Headings / page titles / toast messages use `terms.bookingPlural` = "Appointments" and `terms.bookingVerb` = "Book Appointment" in beauty mode. Walk-in queue: keep "Walk-in Queue" label (it's neutral). Schedule page header: "Stylist Scheduling". |
| **Reuse** | Terms already in `mode-terms.json`; shared pages already partially consume them |
| **Test plan** | E2E: beauty org bookings page title shows "Appointments"; schedule page shows "Stylist Scheduling". |
| **Depends** | HB0-03 |

---

### HB4-03 — Beauty public booking portal

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | `apps/web/app/(portal)/book/page.tsx` or equivalent portal pages |
| **Current** | Public booking portal exists. Mode terms may or may not flow through to it. |
| **Target** | When org `businessType = beauty`: public booking portal shows "Haus of Beauty" brand, pink theme, services filtered by beauty categories, "Book Appointment" CTA, stylist picker labeled "Choose your Stylist". |
| **Test plan** | E2E: navigate to beauty org's public booking URL; verify brand + terms + service category filter. |
| **Depends** | HB0-03 |

---

### HB4-04 — Production integration checklist (beauty-specific)

| Field | Content |
|-------|---------|
| **Type** | documentation / operational |
| **Target** | Document the production checklist for launching a beauty tenant: (1) Set `business_type = beauty` on org; (2) Enable features for plan tier; (3) Seed beauty service catalog with buffer times; (4) Create consent form templates; (5) Enable `clinical` if doing chemical treatments; (6) Configure SMS/WA reminders; (7) Verify deposit policy if taking card pre-auth for chemical bookings. |
| **Depends** | HB3-05 |

---

### HB4-05 — Full beauty E2E smoke run

| Field | Content |
|-------|---------|
| **Type** | QA milestone |
| **Target** | Run full E2E suite against Docker prod stack with beauty org seeded. All beauty spec files green: `beauty-nav-truth`, `beauty-floor-ops`, `beauty-growth`, `beauty-advanced`. Shared flow specs (`core-flows`, `money-loop`, `phase3-hr`, etc.) still green (beauty is shared backend). |
| **Depends** | All HB4 tickets |

---

## Part 4 — Reuse strategy (no duplicate code)

| What | Existing | Beauty approach |
|------|---------|-----------------|
| Walk-in queue | `apps/web/app/(dashboard)/queue/page.tsx` | Just add to `beauty.json` nav |
| Time off / shift swap / onboarding | barber Phase 3 pages | Just add to `beauty.json` nav |
| Booking deposits | barber Phase 5 page | Just add to `beauty.json` nav |
| POS open tabs | barber Phase 5 page | Just add to `beauty.json` nav |
| Client tags / merge / photos | barber Phase 5 pages | Just add to `beauty.json` nav |
| Inventory stock-take / PO | barber Phase 5 pages | Just add to `beauty.json` nav |
| Consent forms | `apps/web/app/(dashboard)/consent-forms/page.tsx` | Fix gate key; add beauty templates to seed |
| Gallery | `apps/web/app/(dashboard)/gallery/page.tsx` | Add senior_barber nav entry in beauty |
| Buffer times | DB columns from B5-02 | Add beauty service defaults in seed |
| Commission / payroll | barber Phase 2-3 pages | Already in beauty nav; just gate-fix |
| Staff specialties | `staff.specialties []string` column | Add UI multi-select; no new API |
| Allergy notes | Extend `customers` table | New migration + extend existing CRM handler |
| Patch test | New table | New migration + 2 handler files under crm module |
| Consultation notes | New table | New migration + 2 handler files under crm module |
| E2E helpers | `ensure-auth.ts`, `crud.ts`, `booking.ts` | Reuse same helpers, pass beauty org credentials |

**New backend code required (HB3 only):**
- Migration `000018_beauty_crm_extras.sql`
- Extend `crm` module: allergy fields, patch tests CRUD, consultation notes CRUD
- 2 new web pages: `/client-patch-tests`, `/client-consultations`
- 1 new feature key: `consultation_history`

Everything else in HB0–HB2 and HB4 is **nav JSON edits, seed data, and E2E tests**.

---

## Part 5 — Progress tracker

| Phase | Status | Shipped | Open | Deviations |
|-------|--------|---------|------|------------|
| HB0 | **Done** | HB0-01–05 | — | E2E deferred |
| HB1 | **Done** | HB1-01–05 | — | E2E deferred |
| HB2 | **Done** | HB2-01–04 | — | E2E deferred; consent page beauty-framed |
| HB3 | **Done** | HB3-01–07 | — | E2E deferred; allergy on appt cards, patch-test warn, consultation on complete |
| HB4 | **Done** | HB4-01–04 | HB4-05 | E2E deferred; checklist → `docs/beauty-production-checklist.md` |

---

## Part 6 — Out of scope

- Spa / nail bar / clinic modes (separate audits needed)
- Full patient intake / SOAP notes (clinic-grade; `clinical` module deeper work)
- Treatment room / resource allocation (shared `resources` table from prototype not yet in charm2)
- Mobile beauty GPS coverage zones (mobile mode only)
- Multi-currency (platform-wide deferred)
- Public storefront for retail products (products mode)
- Beauty-specific public website / landing pages

---

## Appendix A — Beauty service taxonomy

```
BEAUTY_CATEGORIES = [
  braids, weaves, nails, makeup, treatment,
  colour, facial, waxing, lashes, skincare,
  hair_treatment
]
```

Recommended buffer defaults:
| Category | Prep (min) | Buffer/cleanup (min) |
|----------|-----------|----------------------|
| colour / hair_treatment (keratin) | 15 | 10 |
| facial | 5 | 10 |
| waxing | 0 | 5 |
| braids / weaves | 0 | 10 |
| nails / makeup / lashes / skincare | 0 | 5 |

---

## Appendix B — Beauty demo seed target (post-HB0-03)

**Org:** `beauty-demo-salon` · type: `beauty` · plan: `professional`  
**Features:** `bookings`, `crm`, `loyalty`, `marketing`, `inventory_tracking`, `pos_payments`, `tips_management`, `qr_clock`, `customer_reviews`, `staff_commissions_payroll`

**Services (12):**
Box Braids (120min, braids), Knotless Braids (150min), Gel Manicure (60min, nails), Facial Deep Clean (60min, facial), Full Makeup (90min, makeup), Lash Extensions (90min, lashes), Eyebrow Threading (20min, waxing), Silk Press (90min, hair_treatment, 15m prep), Hair Colour (120min, colour, 15m prep + 10m buffer), Wax Full Legs (45min, waxing), Scalp Treatment (60min, treatment), Bridal Package (240min, makeup)

**Staff (4):**
Faith Omondi — specialty: braids, weaves  
Grace Mwangi — specialty: makeup, lashes  
Mary Njeri — specialty: facials, skincare  
Joyce Kariuki — specialty: colour, hair_treatment

**Clients (5):** inc. 1 with `has_allergies=true`, `allergy_notes="Allergic to ammonia/PPD"`

**Consent forms:** Chemical Treatment Consent, Waxing/Facial Consent, Allergy & Patch Test Declaration

**Loyalty:** "Free Eyebrow Threading" (50 pts), "15% off Braids" (100 pts)  
**Packages:** "Facial Series ×6 / 90 days", "Braids Loyalty Pack ×3 / 90 days"

---

## Appendix C — Migration sequence

| # | File | Contents |
|---|------|---------|
| 000017 | `000017_phase5_inventory_enquiry` | Already shipped (stock-takes, POs, enquiry desk) |
| 000018 | `000018_beauty_crm_extras` | `allergy_notes`+`has_allergies` on customers; `customer_patch_tests`; `client_consultations` |
