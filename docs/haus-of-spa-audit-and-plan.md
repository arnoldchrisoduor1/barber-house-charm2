# Haus of Spa — Audit & Phased Implementation Plan

**Mode:** `spa` · **Brand:** Haus of Spa · **Theme:** `theme-spa` (teal `170 55% 38%`)  
**Terms:** Therapist · Guest · Session · Treatment Room · "Wellness Dashboard"  
**Audit date:** 2026-08-04  
**Prototype:** `../barber-house-charm` (`SPA_NAV`, `MODE_TERMS.spa`, `SPA_CATEGORIES`, `DEMO_SERVICES.spa`)  
**Reference audits:** [haus-of-barber-audit.md](./haus-of-barber-audit.md) · [haus-of-beauty-audit-and-plan.md](./haus-of-beauty-audit-and-plan.md)  
**Barber plan (reuse model):** [barber-phased-implementation-plan.md](./barber-phased-implementation-plan.md)

---

## Executive summary

Spa mode is a **re-skin of the shared salon platform** — same Go API, same Next.js pages, same DB schema — differentiated by nav (`spa.json`), mode terms (Therapist / Guest / Session / Treatment Room), and `theme-spa`. Architecture is correct.

**Problem:** `spa.json` never received barber Phases 0–5 or beauty HB0–HB4 hardening. It is thinner than both:

| Metric | Barber | Beauty (post-HB) | Spa (today) |
|--------|--------|------------------|-------------|
| Nav items / unique paths | ~73 / 53 | ~70 / 56 | **44 / 33** |
| Feature-gated paths | most Growth/Sales/HR | most | **only 4** (`pos`, commissions, branding, seat-rental) |
| Demo seed org | yes | yes (`beauty-demo-salon`) | **none** |
| Mode E2E | yes | specs exist | **zero** |
| Mode-specific depth | queue/HR/money | allergy/patch/consult | **stubs only** |

Prototype spa is itself thin: mostly **copy + nav pruning**. Spa-useful depth (treatment rooms, session notes, allergies) lived as **localStorage / therapy / clinical orphans** — not wired into `SPA_NAV`. Charm2 opportunity: ship spa **better than prototype** by (1) floor parity with barber/beauty, (2) real treatment-room booking, (3) real session notes API (not Analytics proxy), (4) reuse beauty CRM allergy fields for "Consent & Allergies".

**Verdict by category:**

| Area | Status |
|------|--------|
| Mode infrastructure (terms, theme, nav routing) | ✅ Complete |
| Core ops (sessions, schedule, staff, CRM, POS) | ✅ Working via shared pages |
| Nav truth (no stubs, correct gates) | ❌ Needs Phase HS0 |
| Spa floor completeness (waitlist, queue, HR, deposits, inventory) | ❌ Missing from nav (prototype also thin — we go beyond) |
| Spa differentiators (rooms, session notes, allergies, spa taxonomy) | ❌ Prototype localStorage / charm2 proxies |
| Guest Experience (loyalty, packages, gallery, consent) | ⚠️ In nav, ungated |
| E2E / spa demo seed | ❌ Missing |

---

## Part 1 — Current state inventory

### 1.1 Nav manifest (`packages/contracts/domain/nav/spa.json`)

44 items · 33 unique paths · 9 sections:  
**Executive · Spa Floor · Front Desk · My Room · Treatments · Sales · Guest Experience · Operations · System**

#### Gate drift (spa nav vs page/API reality)

| Path | Spa nav gate | Page/API gate | Issue |
|------|--------------|---------------|-------|
| `/loyalty` | *(none)* | `loyalty` | Under-gated |
| `/packages`, `/gift-cards` | *(none)* | `marketing` | Under-gated |
| `/reviews` | *(none)* | `customer_reviews` | Under-gated |
| `/tips` | *(none)* | `tips_management` | Under-gated |
| `/qr-attendance` | *(none)* | `qr_clock` | Under-gated |
| `/my-earnings` | *(none)* | `staff_commissions_payroll` | Under-gated |
| `/scorecards`, `/call-centre`, `/revenue-forecast` | *(none)* | `advanced_analytics` | Under-gated |
| `/retail-products` | *(none)* | `inventory_tracking` | Under-gated |
| `/branches` | *(none)* | `multi_branch` | Under-gated |
| `/consent-forms` | *(none)* | `clinical` | Under-gated (label: "Consent & Allergies") |
| `/seat-rental` | `multi_branch` | `staff_commissions_payroll` | **Wrong key** |
| `/payments-demo` | *(none)* | N/A stub | **Remove** |
| `/field-operations` | *(none)* | `coverage_zones` (mobile) | **Remove** |

**Already gated correctly:** `/pos` (`pos_payments`), `/commissions` (`staff_commissions_payroll`), `/branding` (`custom_branding`).

#### Missing from spa nav (pages + APIs live — barber/beauty already wired)

| Path | Feature key | Why spa needs it |
|------|-------------|------------------|
| `/waitlist` | *(bookings)* | Guest walk-in wait (prototype omitted; ops need) |
| `/queue` | `queue` | Live session board |
| `/time-off` | `staff_time_off` | Therapist leave |
| `/shift-swap` | `staff_shift_swap` | Shift trades |
| `/onboarding-checklist` | `staff_onboarding` | New-hire checklists |
| `/booking-deposits` | `booking_deposits` | Retreat / couples deposits |
| `/pos/tabs` | `pos_payments` | Open guest tabs |
| `/payroll` | `staff_commissions_payroll` | Therapist payroll |
| `/client-ownership` | `crm` | Guest → therapist assignment |
| `/client-tags`, `/clients/merge`, `/client-photos` | `crm` | CRM extras |
| `/reconciliation` | `pos_payments` | Cash-up |
| `/inventory`, `/consumption`, `/suppliers` | `inventory_tracking` | Oils, stones, robes |
| `/inventory/stock-take`, `/inventory/purchase-orders` | `inventory_tracking` | Stock ops |
| `/promotions`, `/referrals` | `promotions_referrals` | Growth |
| `/marketing` | `marketing` | Campaigns |
| `/whatsapp` | `sms_reminders` | Guest reminders |
| `/qr-clock` | `qr_clock` | Front desk / therapist clock |

#### Spa-mode differentiator paths (pages thin or missing)

| Path | Feature | Charm2 today | Prototype |
|------|---------|--------------|-----------|
| `/session-notes` | `therapy_notes` | **AnalyticsPage proxy** — no write API | Real `session_notes` Supabase CRUD |
| `/progress-tracking` | `therapy_notes` | Analytics proxy | Progress UI |
| `/resources` | *(new)* | **Missing** | `ResourcesPage` localStorage rooms/beds/sauna |
| `/patient-intake` | `clinical` | Analytics proxy (clinic nav) | Clinic intake |
| `/aftercare` | `clinical` | Analytics proxy (clinic nav) | Aftercare lists |
| `/clinical/*` allergies/SOAP/mood | — | Not ported | localStorage orphans — **clinic/spa lite reuse allergy from beauty instead** |

---

### 1.2 Prototype spa inventory (source of truth for product intent)

| Layer | Path | Spa behavior |
|-------|------|--------------|
| Terms | `src/hooks/useBusinessCategory.tsx` → `MODE_TERMS.spa` | Therapist, Guest, Session, Treatment Room |
| Nav | `src/components/AppLayout.tsx` → `SPA_NAV` | Matches charm2 `spa.json` (labels/sections) |
| Theme | `src/index.css` → `.theme-spa` | Teal primary |
| Taxonomy | `src/lib/serviceCategories.ts` → `SPA_CATEGORIES` | massage, body_treatment, hydrotherapy, aromatherapy, hot_stone, reflexology, sauna, steam, detox, meditation, yoga, couples_package, prenatal, deep_tissue, swedish |
| Demo | `src/lib/demoData.ts` → `DEMO_SERVICES.spa` | 14 treatments (Swedish → Half-Day Retreat) |
| Rooms | `src/pages/ResourcesPage.tsx` → `/resources` | **Not in SPA_NAV**; LS key `resources` |
| Session notes | `src/pages/SessionNotesPage.tsx` | On THERAPY_NAV; table `session_notes` |
| Consent | `/consent-forms` as "Consent & Allergies" | In SPA_NAV Guest Experience |

**Prototype deliberate omissions (vs barber):** waitlist, queue, inventory nav, payroll, promotions, WhatsApp, client ownership, My Clients on therapist hub.

**Product decision for charm2:** treat prototype omissions as **under-scoped**, not sacred. Spa walk-in + inventory + HR + growth are required for production (same bar as beauty HB1–HB2). Keep spa *labels* and *wellness differentiators*; do **not** keep the thin sidebar.

---

### 1.3 Web pages (spa perspective)

Shared pages exist for all current `spa.json` paths. Differences:

- Labels via `useBusinessCategory().terms` (Guest, Session, Therapist, Treatment Room)
- Theme via `theme-spa`
- Brand via `Haus of Spa`

**Copy leftovers to fix:**

| Page | Problem | Spa fix |
|------|---------|---------|
| Staff invite / roles | "Senior Barber" | `terms.seniorStaff` = Senior Therapist |
| Seat rental | "Assigned barber" / Chair | Treatment Room + Therapist |
| Client ownership | "Select barber" | Select therapist / Guest |
| Bookings | "Bookings" / Appointment | Session / Book Session |
| Consent forms | Clinic/beauty framing | Wellness consent + allergies (reuse CRM allergy) |
| Session notes | Analytics stub | Real CRUD (HS3) |

---

### 1.4 API / backend

Mode-agnostic (correct). No spa-specific handlers today.

| Module | Spa use |
|--------|---------|
| `booking` | Sessions, waitlist, deposits, buffers |
| `services` | Spa treatment catalog + categories |
| `crm` | Guests, ownership, tags, **allergy fields (from beauty HB3)** |
| `staff` | Therapists, QR, time-off, onboarding, swap |
| `pos` / `payroll` / `inventory` / `marketing` | Shared |
| `settings` | Consent forms, gallery, branding |
| **New (HS3)** | `resources` (rooms) · `session_notes` real CRUD |

---

### 1.5 E2E / seed

| Item | Status |
|------|--------|
| Barber seed `demo-salon` | ✅ |
| Beauty seed `beauty-demo-salon` | ✅ |
| Spa seed | ❌ |
| Spa Playwright specs | ❌ |
| beauty-auth helper pattern | ✅ — clone as `spa-auth.ts` |

---

## Part 2 — Gap analysis

### G1. Nav stubs + wrong-mode (HIGH)

Remove `/payments-demo`, `/field-operations`. Fix `/seat-rental` → `staff_commissions_payroll`. Add gates from §1.1 table.

### G2. Floor / growth / inventory parity (HIGH)

Spa sidebar thinner than prototype needs *and* thinner than beauty post-HB1. Add waitlist, queue, HR trio, deposits, tabs, payroll, CRM extras, inventory suite, promotions/referrals/marketing/WhatsApp, QR clock, My Guests on My Room.

### G3. Spa differentiators (HIGH for product uniqueness)

1. **Treatment room / resource allocation** — first-class rooms/beds/facilities; optional bind to session booking (prototype never finished this).
2. **Session notes (real)** — replace Analytics proxy with guest/therapist notes timeline (reuse shape of beauty consultations or port prototype `session_notes`).
3. **Guest allergies** — already on `customers` (beauty HB3); surface on spa consent UX + session cards.
4. **Spa service taxonomy + specialty matching** — `SPA_CATEGORIES` enum on services; therapist specialties multi-select.
5. **Couples / dual-therapist sessions** — optional HS3+: booking with 2 staff + 1 room (beyond prototype; better).
6. **Aftercare / pre-treatment templates** — lightweight spa checklists under `clinical` (not full SOAP).

### G4. Copy / role labels (LOW-MEDIUM)

Role API stays `senior_barber` / `junior_barber`. UI shows Senior/Junior Therapist via terms.

### G5. Feature keys (MEDIUM)

| Key | Action |
|-----|--------|
| `therapy_notes` | Exists — wire to real session-notes API + spa nav |
| `clinical` | Gate consent; enable for spa guest wellness consent |
| `resource_booking` | **New** — treatment rooms + allocation (minPlan: professional) |
| `consultation_history` | Optional reuse for spa notes *or* keep separate `therapy_notes` entity |

### G6. Seed + E2E (HIGH)

No spa org → regressions invisible. Need seed + `spa-nav-truth` / floor / growth / spa-advanced specs.

---

## Part 3 — Phased implementation plan

**Ticket ID scheme:** `HS{phase}-{nn}` (HS = Haus of Spa)  
**Reuse rule:** Barber Phases 1–5 + Beauty HB0–HB3 APIs/pages already live. HS0–HS2 mostly nav + seed + E2E + copy. **New backend primarily HS3** (resources, session notes).  
**Phase gate:** E2E green before next phase (when testing resumes).  
**Better-than-prototype rule:** do not ship Analytics proxies as "done"; do not skip floor parity because prototype omitted it.

---

## Phase HS0 — Truth & trust (nav parity)

**Goal:** Spa sidebar tells truth. Stubs gone. Gates match pages/API. Spa org in seed. Nav-truth E2E green. Mode-term copy fixed.

**Out of phase:** Rooms. Real session notes. Floor adds (HS1). Growth depth (HS2).

---

### HS0-01 — Remove stubs + wrong-mode items

| Field | Content |
|-------|---------|
| **Type** | nav fix |
| **Files** | `packages/contracts/domain/nav/spa.json` |
| **Target** | Remove `/payments-demo` (Front Desk + Sales), `/field-operations` |
| **Reuse** | Beauty HB0-01 / Barber B0-02 |
| **Depends** | None |

---

### HS0-02 — Fix feature gate mismatches

| Field | Content |
|-------|---------|
| **Type** | gate fix |
| **Files** | `spa.json`; `npm run generate:e2e-routes` |
| **Gate additions** | |
| `/loyalty` | `loyalty` |
| `/packages`, `/gift-cards` | `marketing` |
| `/reviews` | `customer_reviews` |
| `/tips` | `tips_management` |
| `/qr-attendance` | `qr_clock` |
| `/my-earnings` | `staff_commissions_payroll` |
| `/scorecards`, `/call-centre`, `/revenue-forecast` | `advanced_analytics` |
| `/retail-products` | `inventory_tracking` |
| `/branches` | `multi_branch` |
| `/seat-rental` | `staff_commissions_payroll` (**fix**) |
| `/consent-forms` | `clinical` |
| **Depends** | HS0-01 |

---

### HS0-03 — Seed spa org for E2E

| Field | Content |
|-------|---------|
| **Type** | test infrastructure |
| **Files** | `apps/api/cmd/seed/spa.go`; call from `main.go` |
| **Target** | Org `spa-demo-wellness` · `BusinessType: "spa"` · plan `professional` · features: bookings, crm, loyalty, marketing, inventory_tracking, pos_payments, clinical, tips_management, qr_clock, customer_reviews, staff_commissions_payroll. CEO same demo email (multi-org). Therapists ×4, guests ×5 (1 with allergies), spa treatments with buffers, loyalty + packages, consent templates (Massage Consent, Contra-indication Declaration, Pregnancy Massage Consent). |
| **Depends** | None |

---

### HS0-04 — Spa nav-truth E2E + routes regen

| Field | Content |
|-------|---------|
| **Type** | test |
| **Files** | `e2e/flows/spa-nav-truth.spec.ts`; `e2e/helpers/spa-auth.ts`; `playwright.config.ts` |
| **Target** | Auth → select spa org; assert stubs absent; theme-spa + Haus of Spa; gated items respect features |
| **Depends** | HS0-01, HS0-02, HS0-03 |

---

### HS0-05 — Mode-term copy on shared pages

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | staff, seat-rental, client-ownership, bookings, schedule, consent-forms |
| **Target** | Consume `terms.*` everywhere beauty already patched; extend any residual barber strings for spa |
| **Depends** | HS0-03 |

---

## Phase HS1 — Spa floor completeness

**Goal:** Operational parity with post-Phase-1 barber / post-HB1 beauty. Nav wiring + E2E. No new backend.

---

### HS1-01 — Waitlist + Walk-in Queue

| Field | Content |
|-------|---------|
| **Files** | `spa.json` |
| **Target** | `/waitlist` Spa Floor + Front Desk; `/queue` gated `queue` (Spa Floor + Front Desk) |
| **Reuse** | Existing queue/waitlist pages |
| **Depends** | HS0-04 |

---

### HS1-02 — HR operations

| Field | Content |
|-------|---------|
| **Target** | `/time-off` (`staff_time_off`), `/shift-swap` (`staff_shift_swap`), `/onboarding-checklist` (`staff_onboarding`) — Executive + My Room as appropriate |
| **Depends** | HS0-04 |

---

### HS1-03 — Deposits, POS tabs, CRM extras, payroll

| Field | Content |
|-------|---------|
| **Target** | `/booking-deposits`, `/pos/tabs`, `/client-tags`, `/clients/merge`, `/client-photos`, `/client-ownership`, `/payroll`; Front Desk/My Room `/qr-clock`; Spa Floor manager `/pos` + `/finance` + attendance `/staff` where missing |
| **Depends** | HS0-04 |

---

### HS1-04 — Inventory operations

| Field | Content |
|-------|---------|
| **Target** | Sales section: `/inventory`, `/consumption`, `/suppliers`, `/inventory/stock-take`, `/inventory/purchase-orders`, `/reconciliation` — all `inventory_tracking` / `pos_payments` as appropriate |
| **Depends** | HS0-03 |

---

### HS1-05 — Spa floor ops E2E

| Field | Content |
|-------|---------|
| **Files** | `e2e/flows/spa-floor-ops.spec.ts` |
| **Target** | Session create → advance → checkout; queue walk-in; time-off block |
| **Depends** | HS1-01–03 |

---

## Phase HS2 — Guest Experience & growth

**Goal:** Growth suite wired + tested. Loyalty, packages, gift cards, gallery, consent+allergies, marketing, WhatsApp.

---

### HS2-01 — Consent & allergies for spa

| Field | Content |
|-------|---------|
| **Type** | hardening + content |
| **Files** | seed consent templates; consent-forms spa framing; guest list allergy badge (reuse `has_allergies`) |
| **Target** | Keep `clinical` gate. Seed: Massage Consent, Contra-indication Declaration, Pregnancy Massage Consent. Appointment/session cards show allergy alert (beauty HB3 pattern). |
| **Depends** | HS0-03 |

---

### HS2-02 — Growth nav + gate verification

| Field | Content |
|-------|---------|
| **Target** | Add `/promotions`, `/referrals`, `/marketing`, `/whatsapp` to Guest Experience / Operations. Verify loyalty/packages/gift-cards gates from HS0-02. Seed Wellness Monthly Pass, Detox Programme packages. |
| **Depends** | HS0-02, HS0-03 |

---

### HS2-03 — Ambience gallery + My Room gallery

| Field | Content |
|-------|---------|
| **Target** | Verify gallery under spa org; add `/gallery` to My Room for senior therapists |
| **Depends** | HS0-03 |

---

### HS2-04 — Growth E2E

| Field | Content |
|-------|---------|
| **Files** | `e2e/flows/spa-growth.spec.ts` |
| **Target** | Loyalty, package, gift card, consent, gallery smoke |
| **Depends** | HS2-01–03 |

---

## Phase HS3 — Spa-specific depth (better than prototype)

**Goal:** Features that make Haus of Spa meaningfully different: treatment rooms, real session notes, spa taxonomy/matching, couples-ready packages, aftercare lite.

**Backend required.**

---

### HS3-01 — Treatment resources (rooms / beds / facilities)

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | Migration `000019_spa_resources`; `apps/api/internal/modules/resources/` (or booking submodule); page `apps/web/app/(dashboard)/resources/page.tsx` |
| **Target** | Table `resources` (`organization_id`, `name`, `type` enum room\|bed\|equipment\|facility, `capacity`, `status`, `branch_id`). CRUD API org-scoped. UI board matching prototype ResourcesPage but server-backed. Feature key: `resource_booking` (add to `features.json`, minPlan professional). |
| **Better than prototype** | Real multi-tenant DB; status updates; branch-scoped |
| **Depends** | HS0-03 |

---

### HS3-02 — Bind resource to session booking

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | `bookings.resource_id` nullable FK; booking wizard step "Choose room"; conflict check (room double-book) |
| **Target** | When `resource_booking` on: optional room pick; block overlapping bookings for same resource; couples service may require capacity ≥ 2 |
| **Better than prototype** | Prototype never linked rooms to bookings |
| **Depends** | HS3-01 |

---

### HS3-03 — Real session notes (replace Analytics proxy)

| Field | Content |
|-------|---------|
| **Type** | new-feature-on-top |
| **Files** | Migration session_notes (or reuse `client_consultations` with spa framing); replace `session-notes/page.tsx` stub; progress-tracking lite |
| **Target** | CRUD `/organizations/:org/session-notes` gated `therapy_notes`. Fields: guest_id, staff_id, booking_id?, session_date, title, content (focus, pressure, oils, contraindications, next visit). List + dialog UI ported from prototype SessionNotesPage. |
| **Product choice** | Prefer dedicated `session_notes` table (therapy/spa-facing) over overloading beauty `client_consultations` — cleaner feature gates |
| **Depends** | HS0-03 |

---

### HS3-04 — Spa service taxonomy + therapist specialty matching

| Field | Content |
|-------|---------|
| **Type** | hardening |
| **Files** | services page category enum; staff specialty multi-select; BookingWizard sort (already exists for beauty categories — extend SPA list) |
| **Target** | `SPA_CATEGORIES` constant in web (contracts JSON optional). Services form: enum dropdown in spa mode. Staff: specialties multi-select. Booking: specialty match badge/sort. |
| **Depends** | HS0-03 |

---

### HS3-05 — Buffer defaults for spa seed

| Field | Content |
|-------|---------|
| **Target** | Seed: Massage 5 prep + 10 cleanup; Hot stone 15 prep + 10; Body wrap 10+15; Steam 0+10; Half-day retreat 15+15 |
| **Depends** | HS0-03 |

---

### HS3-06 — Aftercare / pre-treatment templates (lite)

| Field | Content |
|-------|---------|
| **Type** | content + light wiring |
| **Target** | Spa-specific aftercare templates under `/aftercare` + `clinical` (or settings templates). Pre-treatment: hydrate / no alcohol reminders — seed content + nav entry for spa under Guest Experience. Prefer finishing real content over shipping empty Analytics proxy forever — either flesh CRUD or mark deprecated. |
| **Depends** | HS3-03 |

---

### HS3-07 — Feature keys + nav for HS3

| Field | Content |
|-------|---------|
| **Files** | `features.json` (+ api mirror); `spa.json`; e2e routes |
| **Target** | Add `resource_booking`. Nav: `/resources` (Operations/System), `/session-notes` + `/progress-tracking` (Treatments / My Room, `therapy_notes`), optional `/aftercare` (`clinical`) |
| **Depends** | HS3-01, HS3-03 |

---

### HS3-08 — Spa advanced E2E

| Field | Content |
|-------|---------|
| **Files** | `e2e/flows/spa-advanced.spec.ts` |
| **Target** | Create room → book session into room → conflict; session note after complete; specialty match; allergy alert on guest session |
| **Depends** | HS3-01–04 |

---

## Phase HS4 — Polish & production readiness

---

### HS4-01 — Role / directory labels (Therapist)

| Field | Content |
|-------|---------|
| **Target** | Staff invite + directory: Senior/Junior Therapist; page title Therapists |
| **Depends** | HS0-03 |

---

### HS4-02 — Session flow terms

| Field | Content |
|-------|---------|
| **Target** | Bookings page → `terms.bookingsPageTitle` / `bookingVerb`; schedule → Therapist Scheduling; queue label "Walk-in Queue" OK |
| **Depends** | HS0-03 |

---

### HS4-03 — Public booking portal (spa)

| Field | Content |
|-------|---------|
| **Target** | `/book/spa-demo-wellness`: Haus of Spa brand, `theme-spa`, Book Session CTA, Choose your Therapist, spa category filter |
| **Reuse** | Beauty HB4-03 public org endpoint pattern |
| **Depends** | HS0-03 |

---

### HS4-04 — Production checklist (spa)

| Field | Content |
|-------|---------|
| **Files** | `docs/spa-production-checklist.md` |
| **Target** | business_type=spa; features; seed catalog+buffers; enable clinical + therapy_notes + resource_booking; consent templates; room inventory; SMS/WA; deposit policy for retreats |
| **Depends** | HS3-05 |

---

### HS4-05 — Full spa E2E smoke

| Field | Content |
|-------|---------|
| **Target** | `spa-nav-truth`, `spa-floor-ops`, `spa-growth`, `spa-advanced` green on Docker prod stack. Shared specs still green. |
| **Depends** | All HS4 tickets |

---

## Part 4 — Reuse strategy (no duplicate platform)

| What | Existing | Spa approach |
|------|----------|--------------|
| Queue / waitlist / HR / deposits / tabs / CRM extras / inventory | Barber + beauty pages | Nav only |
| Allergy on customers | Beauty HB3 columns | Surface in spa consent + session cards |
| Specialty sort in BookingWizard | Beauty HB3 | Add SPA_CATEGORIES |
| Public org theme | Beauty HB4-03 | Spa theme class |
| Consent CRUD | Settings module | Spa templates + clinical gate |
| Gallery | Shared | Ambience label already |
| Seat rental | Shared | Labels → Room Rental / Therapist |
| Session notes UI pattern | Prototype + beauty consultations | **New** real API (do not leave AnalyticsProxy) |
| Resources | Prototype LS only | **New** module + booking bind |

**New backend (HS3):**
- Migration `000019_spa_resources` (+ session_notes if not reusing consultations)
- `resource_booking` feature key
- Resources module + booking `resource_id`
- Real session-notes handlers
- Spa seed file
- Web: `/resources` page; replace session-notes proxy

---

## Part 5 — Progress tracker

| Phase | Status | Shipped | Open | Deviations |
|-------|--------|---------|------|------------|
| HS0 | **Done** | HS0-01–05 | — | E2E deferred |
| HS1 | **Done** | HS1-01–05 | — | E2E deferred |
| HS2 | **Done** | HS2-01–04 | — | E2E deferred; consent spa-framed |
| HS3 | **Done** | HS3-01–07 | — | E2E deferred; room↔booking bind, real session notes |
| HS4 | **Done** | HS4-01–04 | HS4-05 | E2E deferred; checklist → `docs/spa-production-checklist.md` |

---

## Part 6 — Out of scope

- Full clinic SOAP / patient medical records (clinic mode)
- Telehealth / mood tracking prototypes (orphan — defer)
- Beauty chemical patch tests as spa default (optional later)
- Mobile GPS coverage zones
- Multi-currency
- Public spa marketing microsite
- Nail / beauty / clinic audits (separate)

---

## Appendix A — Spa service taxonomy

```
SPA_CATEGORIES = [
  swedish, deep_tissue, hot_stone, aromatherapy, massage,
  body_treatment, hydrotherapy, reflexology, sauna, steam,
  detox, meditation, yoga, couples_package, prenatal
]
```

Recommended buffers:

| Category | Prep (min) | Buffer (min) |
|----------|------------|--------------|
| hot_stone | 15 | 10 |
| body_treatment / detox wrap | 10 | 15 |
| swedish / deep_tissue / aromatherapy | 5 | 10 |
| prenatal | 5 | 10 |
| couples_package / half-day | 15 | 15 |
| steam / sauna / hydrotherapy | 0 | 10 |
| meditation | 0 | 5 |

---

## Appendix B — Spa demo seed target (post-HS0-03)

**Org:** `spa-demo-wellness` · type: `spa` · plan: `professional`  
**Features:** bookings, crm, loyalty, marketing, inventory_tracking, pos_payments, tips_management, qr_clock, customer_reviews, staff_commissions_payroll, clinical (+ later therapy_notes, resource_booking)

**Treatments (from prototype DEMO_SERVICES.spa):**  
Swedish, Deep Tissue, Hot Stone, Aromatherapy, Body Scrub & Wrap, Couples Massage, Reflexology, Steam & Sauna, Prenatal, Thai, Mud Wrap Detox, Hydrotherapy, Guided Meditation, Half-Day Spa Retreat

**Therapists (4):** specialties matching spa categories (massage, hot_stone, hydrotherapy, prenatal, …)

**Guests (5):** one with `has_allergies` / essential-oil sensitivity note

**Consent:** Massage Consent · Contra-indication Declaration · Pregnancy Massage Consent  

**Loyalty / Packages:** Free Steam Session (40 pts); Wellness Monthly Pass; Detox Programme ×4  

**Resources (HS3 seed):** Treatment Room 1–3, Couple Suite, Sauna, Steam Room, Spa Bed A/B

---

## Appendix C — Migration sequence

| # | File | Contents |
|---|------|----------|
| 000018 | `000018_beauty_crm_extras` | Already shipped (allergies, patch tests, consultations) — spa reuses allergy columns |
| 000019 | `000019_spa_resources` | `resources` table; `bookings.resource_id`; `session_notes` table if not deferred to consultations |

---

## Appendix D — Comparison: prototype vs charm2 target

| Capability | Prototype spa | Charm2 target (this plan) |
|------------|---------------|---------------------------|
| Mode terms / theme / nav labels | ✅ | ✅ keep |
| Floor queue / waitlist | ❌ omitted | ✅ add (HS1) |
| Inventory / payroll / growth nav | ❌ thin | ✅ add (HS1–HS2) |
| Treatment rooms | LS only, unbound | ✅ DB + booking bind (HS3) |
| Session notes | Real on therapy nav | ✅ Real on spa nav (HS3) |
| Guest allergies | Consent label only | ✅ CRM flag + alerts (reuse beauty) |
| Couples room capacity | Demo service only | ✅ capacity check via resources |
| E2E / seed | Demo data client-side | ✅ spa-demo-wellness + Playwright |
| Field ops / payments demo | In nav | ❌ remove |

---

## Implementation order (when building)

1. **HS0** — nav truth + seed + copy (fast, unblocks everything)  
2. **HS1** — floor nav parity (fast)  
3. **HS2** — guest experience (fast)  
4. **HS3** — resources + session notes (real product work)  
5. **HS4** — polish + checklist; run E2E when Docker storage available  

Skip Docker rebuild until HS0–HS3 code lands — then one rebuild for HS4-05.
