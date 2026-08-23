# Haus Modes Feature-Parity Audit — Nails · Aesthetics · Mobile · Therapy · Solo-Pro · Products

**Date:** 2026-08-05
**Scope:** feature parity of six remaining modes in charm2 (production) vs `../barber-house-charm` prototype.
**Method:** per-mode inventory of prototype nav/pages/flows/toasts → charm2 status (Implemented / Partial / Missing / Broken) → ranked gaps. "Implemented" = reachable from that mode's nav, functional end-to-end, not regressed vs prototype. Partial counts as gap.
**Prototype references confirmed:** `NAIL_BAR_NAV` (AppLayout.tsx 221–270), `CLINIC_NAV` (272–324), `MOBILE_NAV` (326–387), `THERAPY_NAV` (389–431), `PRODUCTS_NAV` (433–500), `MODE_TERMS` (useBusinessCategory.tsx 31–162).
**Solo-pro caveat (flagged, not guessed):** prototype `getNavForMode` modeMap (AppLayout.tsx 505–515) has **no** `solo_pro` **entry** — solo falls back to `BARBER_NAV`. `MobileSoloProDashboard.tsx` is mounted only for **mobile staff** (DashboardPage.tsx ~319–335), never for solo_pro. Solo parity target = barber nav surface + solo terms/theme + entry funnel + pricing SKU.

---

## 1. Executive summary

### 1.1 Gap counts per mode


| Mode                  | P1 (blocks core workflow) | P2 (degrades UX) | P3 (nice-to-have) | Total  | Headline problem                                                                       |
| --------------------- | ------------------------- | ---------------- | ----------------- | ------ | -------------------------------------------------------------------------------------- |
| Nails (`nail_bar`)    | 5                         | 5                | 5                 | 15     | No seed/E2E; gate drift; field-ops mis-wired; no nail taxonomy                         |
| Aesthetics (`clinic`) | 5                         | 7                | 6                 | 18     | Patient intake **Broken** (analytics proxy); aftercare static; no clinic consent types |
| Mobile (`mobile`)     | 5                         | 5                | 3                 | 13     | `mobileSpecialty` missing; coverage zones **Broken**; no dispatch/hub dashboards       |
| Therapy (`therapy`)   | 5                         | 7                | 5                 | 17     | Progress tracking wrong model; session notes create-only + spa-skewed                  |
| Solo-Pro (`solo_pro`) | 4                         | 6                | 5                 | 15     | Register specialty **overwrites org type**; earnings/POS entitlement mismatches        |
| Products (`products`) | 4                         | 6                | 4                 | 14     | Public storefront + online orders **Missing**; dashboard salon-generic                 |
| **Total**             | **28**                    | **36**           | **28**            | **92** |                                                                                        |


### 1.2 What's already solid (all six modes)

- **Nav manifests** (`packages/contracts/domain/nav/*.json`) are 1:1 ports of prototype nav arrays (labels/paths/sections/roles) — except `solo_pro.json`, which is a deliberate thin redesign (10 items) vs prototype's BARBER_NAV fallback.
- **Mode terms** (`mode-terms.json`) match prototype `MODE_TERMS` verbatim for all six modes; brands + theme class mapping present.
- **Theme CSS**: all six token blocks exist in `apps/web/app/globals.css` (123–199). Charm2 is *ahead* of prototype for products — prototype references `theme-products` but never defines it in `index.css`.
- **Shared platform pages** (bookings, schedule, staff, clients, POS, finance, reports, marketing, chat, settings…) are real API-backed implementations serving every mode via terms.
- **Pricing**: `pricing.json` includes all 9 platforms + `solo_pro: 999`; `features.json` planHierarchy includes `solo_pro` (fixes a prototype bug where the FE hierarchy omitted it).

### 1.3 Overall risk areas (cross-mode)

1. **Zero seeds, zero E2E for all six modes.** Seeds exist only for barber/beauty/spa (`apps/api/cmd/seed/{main,beauty,spa}.go`); Playwright wires only barber/beauty/spa nav-truth/floor-ops specs (`playwright.config.ts:52`). None of these modes can be QA'd or regression-tested today.
2. **Nav gate drift everywhere.** Mode navs carry almost no `requiredFeature` while pages/API gate on `clinical`, `therapy_notes`, `loyalty`, `marketing`, `tips_management`, `advanced_analytics`, `qr_clock`, `inventory_tracking`, `multi_branch` etc. Users see items that render blank/locked. Violates the feature-flag invariant (nav item should disappear when feature off).
3. **Analytics-proxy anti-pattern.** Several "clinical" pages are read-only JSON dumps proxied through the analytics module instead of real CRUD: patient intake (customers SELECT), aftercare (bookings proxy, unused), coverage zones (SELECT with a **schema mismatch** — queries `description`, table has `city/radius_km/surcharge_kes` per `000002_modules.up.sql` 94–107), field operations (last-50-bookings proxy), session-notes/progress legacy proxies.
4. **Cross-mode mis-wires.** `/field-operations` (mobile `coverage_zones` feature) sits in nail/clinic/therapy navs; `/payments-demo` stub (with "Haircut + beard trim" copy) sits in every mode's nav; therapy `/seat-rental` nav gate (`multi_branch`) conflicts with page gate (`staff_commissions_payroll`).
5. **Solo-pro signup is wrong.** `register/page.tsx` 80–82 maps `solo_pro` + specialty → `businessType = specialty`, so a "Solo Barber" signup creates a **barber** org — wrong nav, theme, terms, pricing.
6. **Mode taxonomies missing.** `mode-crud-configs.ts` has only `BEAUTY_`*/`SPA_`* service categories; nail/clinic/therapy/mobile/solo fall back to free-text — prototype had full taxonomies in `serviceCategories.ts`.

---

## 2. Per-mode detailed audits

Status legend: ✅ Implemented · ◐ Partial · ✗ Missing · ⛔ Broken

---

### 2.1 Nails (`nail_bar` · Haus of Nails · theme-nail, rose `350 65% 55%`)

**Prototype surface:** `NAIL_BAR_NAV` = 40 items / 30 unique paths / 7 sections. Only `/pos` feature-gated. Terms: Nail Tech · Client · Appointment · Station. Taxonomy `NAIL_BAR_CATEGORIES` (`serviceCategories.ts:18-21`): manicure, pedicure, gel_nails, acrylic_nails, nail_art, dip_powder, nail_repair, nail_extensions, shellac, paraffin_wax. Demo: 13 nail services, nail staff/clients, "Free Nail Art Add-on" loyalty, retail SKUs (cuticle oil etc.), gallery of nail-art titles. Onboarding presets ("Classic Manicure", placeholder "Polished Nail Studio"). Nail-specific labels are nav-level ("Nail Art Gallery", "Allergy Forms", "Walk-in Queue"); pages are shared + `terms.`*.

**Charm2 nav/terms/theme:** `nav/nail_bar.json` exact match to prototype (40 items). `mode-terms.json` nail_bar exact. `.theme-nail` tokens exact (globals.css 123–134).

**Inventory + status (30 unique paths):**


| Item                               | Path                | Status | Note                                                                                                              |
| ---------------------------------- | ------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Nail Bar / Station / My Dashboard  | `/dashboard`        | ✅      | Shared analytics dashboard via terms; no nail-only layout (prototype also none)                                   |
| Locations                          | `/branches`         | ◐      | Works; needs `multi_branch`, nav ungated                                                                          |
| Reports & Analytics                | `/reports`          | ✅      | Live `/analytics/reports`                                                                                         |
| Finance                            | `/finance`          | ✅      | Full finance workspace                                                                                            |
| Audit Log                          | `/audit-log`        | ✅      | Audit CRUD list                                                                                                   |
| QR Attendance                      | `/qr-attendance`    | ◐      | Real; gated `qr_clock`, nav ungated                                                                               |
| Nail Tech Scorecards               | `/scorecards`       | ✅      | `/analytics/scorecards`; title generic "Scorecards"                                                               |
| Haus Connect                       | `/call-centre`      | ✅      | Enquiry desk; `advanced_analytics`                                                                                |
| Today's Schedule                   | `/schedule`         | ✅      | Shared schedule                                                                                                   |
| Appointments                       | `/bookings`         | ✅      | BookingWizard + status transitions                                                                                |
| Walk-in Queue                      | `/queue`            | ✅      | Better than prototype (create + advance); feature `queue`                                                         |
| Clients / Check-in                 | `/clients`          | ✅      | Mode-crud customers incl. allergy fields                                                                          |
| POS                                | `/pos`              | ✅      | PosWorkspace behind `pos_payments`                                                                                |
| Payments Demo                      | `/payments-demo`    | ✗      | Stub, disabled button, barber sample copy — worse than prototype demo                                             |
| Reviews / My Reviews               | `/reviews`          | ✅      | API-backed                                                                                                        |
| My Earnings                        | `/my-earnings`      | ◐      | Live; gated `staff_commissions_payroll`, nav ungated for techs                                                    |
| Nail Services                      | `/services`         | ◐      | CRUD works; **no** `NAIL_BAR_CATEGORIES` **select** — free-text category                                          |
| Nail Tech Directory                | `/staff`            | ✅      | Terms → Senior/Junior Nail Tech                                                                                   |
| Loyalty                            | `/loyalty`          | ◐      | Thin CRUD; needs `loyalty`, nav ungated                                                                           |
| Packages                           | `/packages`         | ◐      | Thin CRUD; needs `marketing`                                                                                      |
| Gift Cards                         | `/gift-cards`       | ◐      | Thin CRUD; needs `marketing`                                                                                      |
| Nail Art Gallery                   | `/gallery`          | ◐      | Real CRUD + upload; no before/after dual-pane; title "Gallery"                                                    |
| Allergy Forms                      | `/consent-forms`    | ◐      | Real CRUD behind `clinical`; nail gets only `{general}` type (`consent-forms/page.tsx:49-50,149`); title mismatch |
| Tips                               | `/tips`             | ✅      | POS extras (`tips_management`)                                                                                    |
| Retail Products                    | `/retail-products`  | ✅      | CRUD + search; `inventory_tracking`                                                                               |
| Field Operations                   | `/field-operations` | ⛔      | Mobile dispatch page (`coverage_zones`) in nail nav — dead for nail orgs                                          |
| Team Chat                          | `/staff-chat`       | ✅      | Channels + send                                                                                                   |
| Notifications / Settings / Support | —                   | ✅      | Shared                                                                                                            |
| Nail seed / E2E                    | —                   | ✗      | No `nails.go`; no nail specs                                                                                      |


**Gaps ranked:**

- **P1-N1** No nail demo seed (`cmd/seed/` has main/beauty/spa only).
- **P1-N2** Zero nail E2E (no nav-truth/floor-ops; not in `playwright.config.ts:52`).
- **P1-N3** Nav gate drift — Growth/Operations almost fully ungated vs page features.
- **P1-N4** `/field-operations` in nail nav — remove or gate off for nail.
- **P1-N5** `/payments-demo` stub in nav — remove.
- **P2-N6** No `NAIL_BAR_CATEGORIES` in services UI (`mode-crud-configs.ts:106-120` only beauty/spa).
- **P2-N7** Allergy Forms: no nail form types (gel/acrylic/chemical allergy, patch-style); page title ≠ nav label.
- **P2-N8** Gallery thinner than prototype (no before/after pairing UX; nav/page title mismatch).
- **P2-N9** Scorecards/My Earnings/QR ungated in nav → 403/blank for lower plans.
- **P2-N10** Missing hardened floor/HR paths (waitlist, time-off, shift-swap, deposits, pos/tabs) that barber/beauty/spa already gained in charm2 — nail below current platform standard.
- **P3** dashboard nail KPI copy, commandRoutes nail keywords, onboarding presets, retail demo SKUs (arrive with seed), "Nail Bar Manager" role label.

---

### 2.2 Aesthetics (`clinic` · Haus of Aesthetics · theme-clinic, blue `210 70% 50%`)

**Prototype surface:** `CLINIC_NAV` = 43 items / 32 unique paths. Clinic-specific: Patient Intake (`/patient-intake` — real Supabase `patient_intake` CRUD: medical history, allergies, medications, emergency contact, consent flag), Consent & Liability (types general/treatment/photo_release/minor + signed/pending KPIs), Aftercare (`aftercare_instructions` CRUD w/ follow-up dates), Before & After gallery, Billing (POS relabel), Procedures & Treatments. Taxonomy `CLINIC_CATEGORIES`: botox, fillers, chemical_peel, microneedling, laser, skin_consultation, prp, thread_lift, body_contouring, iv_drip, led_therapy, hydrafacial. Orphans (command-palette only, localStorage mocks, NOT in nav): digital signature, allergy alerts, SOAP notes, pre-treatment instructions, mood tracking, telehealth, prescriptions.

**Charm2 nav/terms/theme:** `nav/clinic.json` 1:1 (43 items, same 5 gates). Terms + `.theme-clinic` exact.

**Inventory + status (32 unique paths, clinic differentiators expanded):**


| Item                                                                                   | Path                                                             | Status              | Note                                                                                                                      |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Clinic Dashboards (exec/floor/my)                                                      | `/dashboard`                                                     | ✅                   | Terms-driven shared dashboard                                                                                             |
| Clinic Locations                                                                       | `/branches`                                                      | ✅                   | Shared; entitlement `multi_branch`                                                                                        |
| Reports / Finance / Audit Log / QR                                                     | —                                                                | ✅                   | Shared                                                                                                                    |
| Practitioner Scorecards                                                                | `/scorecards`                                                    | ✅                   | `advanced_analytics`                                                                                                      |
| Haus Connect                                                                           | `/call-centre`                                                   | ◐                   | Shared enquiry desk, not clinic-specific                                                                                  |
| Consultation Schedule / Consultations                                                  | `/schedule`, `/bookings`                                         | ✅                   | Shared + terms                                                                                                            |
| Patients / Check-in                                                                    | `/clients`                                                       | ✅                   | Shared CRM + terms                                                                                                        |
| Billing (POS)                                                                          | `/pos`                                                           | ✅                   | Real POS; "Billing" is nav label only                                                                                     |
| Payments Demo                                                                          | `/payments-demo`                                                 | ◐                   | Stub; barber copy                                                                                                         |
| My Practice suite                                                                      | dashboard/bookings/schedule/reviews/earnings                     | ✅                   | Shared staff portal                                                                                                       |
| Procedures & Treatments                                                                | `/services`                                                      | ◐                   | Real CRUD; **no CLINIC_CATEGORIES taxonomy**                                                                              |
| Practitioner Directory                                                                 | `/staff`                                                         | ✅                   | Shared + terms                                                                                                            |
| **Patient Intake**                                                                     | `/patient-intake`                                                | ⛔                   | `AnalyticsPage` → GET customers JSON dump (`analytics/modes.go:19-27`); **no intake CRUD, no** `patient_intake` **table** |
| **Consent & Liability**                                                                | `/consent-forms`                                                 | ◐                   | Real CRUD behind `clinical`; clinic falls through to `{general}` type only; no signed/pending workflow                    |
| **Aftercare**                                                                          | `/aftercare`                                                     | ⛔                   | Static `SPA_AFTERCARE_TEMPLATES` cards; no create/update/delete; analytics aftercare endpoint (bookings proxy) unused     |
| Inventory / Suppliers                                                                  | —                                                                | ✅                   | Shared stack; no clinic consumables seed                                                                                  |
| Treatment Packages                                                                     | `/packages`                                                      | ✅                   | Shared CRUD                                                                                                               |
| Patient Reviews                                                                        | `/reviews`                                                       | ✅                   | Shared                                                                                                                    |
| Before & After                                                                         | `/gallery`                                                       | ◐                   | Gallery CRUD works; no before/after pairing; richer `/client-photos` not in clinic nav                                    |
| Referrals / Marketing                                                                  | —                                                                | ✅                   | Shared                                                                                                                    |
| Revenue Forecast                                                                       | `/revenue-forecast`                                              | ✅                   | Shared                                                                                                                    |
| Field Operations                                                                       | `/field-operations`                                              | ⛔                   | Mobile feature in clinic nav                                                                                              |
| Team Chat / System items                                                               | —                                                                | ✅                   | Shared                                                                                                                    |
| Beauty CRM pages relevant to clinic                                                    | `/client-consultations`, `/client-patch-tests`, `/client-photos` | ✗ (from clinic nav) | Pages Implemented for beauty; unreachable in clinic sidebar                                                               |
| Treatment rooms                                                                        | `/resources`                                                     | ✗ (from clinic nav) | Backend `resources` module + `resource_booking` exist                                                                     |
| Clinic seed / E2E                                                                      | —                                                                | ✗                   | Neither exists                                                                                                            |
| Prototype clinical orphans (SOAP/telehealth/Rx/signature/pre-treatment/allergy-alerts) | `/clinical/*`, `/retail/prescriptions`                           | ✗                   | Orphans in prototype too; not parity blockers                                                                             |


**Gaps ranked:**

- **P1-A1** Real Patient Intake — migration + org-scoped CRUD API + UI (history, allergies, meds, emergency contact, consent flag), gate `clinical`.
- **P1-A2** Real Aftercare — persisted templates/instructions CRUD, optional booking/procedure link.
- **P1-A3** Clinic consent types (botox/fillers/laser/peel liability) + signed/pending state.
- **P1-A4** Clinic demo seed (`clinic.go`: practitioners, CLINIC_CATEGORIES procedures, patients, consumables, packages, gallery).
- **P1-A5** Gate `clinical` (and peers) on clinic nav; enable on demo org.
- **P2-A6** Wire `/client-consultations`, `/client-patch-tests`, `/client-photos` into clinic nav (Clinical/Growth).
- **P2-A7** CLINIC_CATEGORIES into seed + services UI.
- **P2-A8** Remove/hide Field Operations + Payments Demo from clinic nav.
- **P2-A9** `/resources` (treatment rooms) into Clinic Floor with `resource_booking`.
- **P2-A10** Payments Demo copy fix if kept.
- **P2-A11** Clinic E2E (`clinic-nav-truth` + clinical flows) + auth helper.
- **P2-A12** Nav feature gates for gallery/packages/reviews/scorecards/branches/my-earnings.
- **P3** signature capture, allergy alert banner at booking, SOAP/clinical notes, pre-treatment auto-send, telehealth, prescriptions/batch-lot.

---

### 2.3 Mobile (`mobile` · Haus of Mobile · theme-mobile, green `145 60% 42%`)

**Prototype surface:** `MOBILE_NAV` = 61 items / ~37 unique paths / 7 sections (Executive, Dispatch, My Hub, Services, Sales, Growth, System). Differentiators:

- `mobileSpecialty` **mechanism** (parity requirement, `useBusinessCategory.tsx:201-333`): specialty ∈ {barber, beauty, spa, nail_bar, clinic, therapy}, persisted `localStorage["mobile_specialty"]`; when mobile-only, **terms resolve from specialty** (UI says "Barber" not "Mobile Pro") and `effectiveCategories` **= [mobile, specialty]** for service/booking filtering. Nav stays MOBILE_NAV; theme stays green.
- **Dashboard branch** (`DashboardPage.tsx:295-336`): mobile + management → `MobileDispatchDashboard` ("Mobile {Specialty} Dispatch"); mobile + staff → `MobileSoloProDashboard` ("Mobile {Specialty} Hub": online toggle, current/next visit navigate/call/WA/complete, M-Pesa STK, SOS, kit checklist).
- **Coverage Zones** (`/coverage-zones`): real CRUD — name/city/radius_km/surcharge on `coverage_zones`, toasts on add/update/delete.
- **Field Operations** (`/field-operations`): 6 tabs (dispatch/calendar/tracking/payments/comms/zones), specialty-filtered demo data.
- Orphans (command palette only): `/field-ops/tracking|routes|eta-sms|photo-proof|fuel-log`, `/pos/offline-mode`.
- Taxonomy `MOBILE_CATEGORIES`: home_haircut, home_styling, home_makeup, event_styling, mobile_massage, mobile_nails, bridal_package, group_booking; 12 demo mobile services.

**Charm2 nav/terms/theme:** `nav/mobile.json` 1:1 (same 2 gates: whatsapp/referrals). Terms + `.theme-mobile` exact.

**Inventory + status:**


| Item                                                                                          | Path                                | Status | Note                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MOBILE_NAV port / terms / theme                                                               | —                                   | ✅      | Near-verbatim                                                                                                                                            |
| **mobileSpecialty + effectiveCategories**                                                     | —                                   | ✗      | Zero hits in apps/web; get-started generates `specialty=` URL but register only remaps for solo_pro (`register/page.tsx:81`); no org column              |
| **Dispatch Centre dashboard**                                                                 | `/dashboard`                        | ✗      | Generic dashboard; no MobileDispatchDashboard branch                                                                                                     |
| **My Mobile Hub dashboard**                                                                   | `/dashboard`                        | ✗      | No MobileSoloProDashboard equivalent                                                                                                                     |
| **Coverage Zones**                                                                            | `/coverage-zones`                   | ⛔      | AnalyticsPage JSON dump; API SELECTs `description` — column doesn't exist (`analytics/modes.go:110-112` vs `000002_modules.up.sql:94-107`); no write API |
| **Field Operations**                                                                          | `/field-operations`                 | ◐      | Thin 3 tabs; dispatch = bookings query; routes/zones tabs are copy stubs                                                                                 |
| Service Areas                                                                                 | `/branches`                         | ✅      | Shared branches + terms                                                                                                                                  |
| Today's Routes / My Schedule                                                                  | `/schedule`                         | ✅      | Shared                                                                                                                                                   |
| Home Visits / My Visits                                                                       | `/bookings`                         | ◐      | Works; always "Home Visit" terms (no specialty overlay); no address/zone booking UX                                                                      |
| Team / Mobile Pros / Clients                                                                  | `/staff`, `/clients`                | ✅      | Shared                                                                                                                                                   |
| Reports / Finance / Audit / Forecast / Haus Connect                                           | —                                   | ✅/◐    | Shared; forecast + call-centre plan-gated                                                                                                                |
| Mobile Services                                                                               | `/services`                         | ◐      | No specialty `effectiveCategories` filter; no MOBILE_CATEGORIES                                                                                          |
| Inventory & Kit / Retail                                                                      | —                                   | ◐      | Shared inventory; no kit UX                                                                                                                              |
| POS / Commissions / Payroll / Gift Cards                                                      | —                                   | ✅      | Shared                                                                                                                                                   |
| Tips / Loyalty / Packages / Reviews / Gallery / WhatsApp / Promotions / Marketing / Referrals | —                                   | ◐      | Shared surfaces; gate drift                                                                                                                              |
| QR attendance / clock                                                                         | —                                   | ◐      | Feature-gated, nav ungated                                                                                                                               |
| Payments Demo                                                                                 | `/payments-demo`                    | ◐      | Stub                                                                                                                                                     |
| System items                                                                                  | —                                   | ✅      | Shared                                                                                                                                                   |
| CoverageMap / GPS                                                                             | —                                   | ✗      | Placeholder component unused                                                                                                                             |
| Mobile seed / E2E                                                                             | —                                   | ✗      | Neither                                                                                                                                                  |
| Orphan field-ops pages                                                                        | `/field-ops/*`, `/pos/offline-mode` | ✗      | Prototype orphans; optional                                                                                                                              |


**Gaps ranked:**

- **P1-M1** `mobileSpecialty` end-to-end: persist on org, resolve terms + effectiveCategories server-side, wire get-started/register/settings.
- **P1-M2** Coverage Zones real CRUD: fix schema/API (city/radius/surcharge), POST/PATCH/DELETE under `RequireFeature("coverage_zones")`, zone-cards UI.
- **P1-M3** Dispatch/Hub dashboard branches for mobile orgs (bookings-backed, not demo-only).
- **P1-M4** Mobile demo seed + `coverage_zones` enabled on it.
- **P1-M5** Field Operations v1: job list w/ statuses (en_route/on_site/done), staff assignment, booking links; kill empty stub cards.
- **P2-M6** Nav gate alignment for `mobile.json`.
- **P2-M7** Home-visit address/zone on public booking + Service Area copy.
- **P2-M8** ETA broadcast / SOS as real notification hooks behind flags.
- **P2-M9** Mobile E2E: `mobile-nav-truth` + `mobile-floor-ops` + auth helper.
- **P2-M10** MOBILE_CATEGORIES taxonomy + specialty-filtered catalog.
- **P3** GPS map, route optimize, ETA SMS templates, photo proof, fuel log, POS offline queue, kit inventory UX.

---

### 2.4 Therapy (`therapy` · Haus of Therapy · theme-therapy, purple `270 55% 55%`)

**Prototype surface:** `THERAPY_NAV` = 35 items / 30 unique paths. Differentiators: Session Notes (`session_notes` full CRUD + search; toasts "Session note added/updated/deleted"), Client Progress (`progress_tracking` table — **metric_name / metric_value / notes CRUD**; "Progress recorded!"), Intake & Consent (types general/treatment/photo_release/minor), Session Packages / Client Retention / Session Billing relabels. Taxonomy: physiotherapy, counselling, occupational_therapy, cbt, sports_therapy, rehabilitation, pain_management, stress_management, mental_health, couples_therapy, child_therapy; 13 demo sessions. Orphans (palette-only, localStorage): SOAP notes, mood tracking, telehealth.

**Charm2 nav/terms/theme:** `nav/therapy.json` 1:1 (35 items, 3 gates: referrals/pos/seat-rental). Terms + `.theme-therapy` exact. Charm2 has a real Go `therapy` module (org-scoped session-notes CRUD, `RequireFeature("therapy_notes")`, wired in `app.go`) — backend ahead of UI.

**Inventory + status:**


| Item                                                   | Path                                                                                                   | Status | Note                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Practice Dashboards                                    | `/dashboard`                                                                                           | ✅      | Shared + terms                                                                                                                                                           |
| Locations / Reports / Finance / Audit                  | —                                                                                                      | ✅      | Shared                                                                                                                                                                   |
| Therapist Scorecards / Haus Connect / Revenue Forecast | —C:\Users\arnol\OneDrive\Desktop\barber-house-charm2\docsAUDIT.md]([http://AUDIT.md](http://AUDIT.md)) | ◐      | `advanced_analytics` gates, nav ungated                                                                                                                                  |
| Session Schedule / Sessions                            | `/schedule`, `/bookings`                                                                               | ✅      | Terms: Sessions / Therapist Scheduling                                                                                                                                   |
| QR Attendance                                          | `/qr-attendance`                                                                                       | ◐      | `qr_clock`                                                                                                                                                               |
| My Sessions suite                                      | —                                                                                                      | ✅/◐    | Shared staff hub; earnings gated                                                                                                                                         |
| Therapy Sessions (services)                            | `/services`                                                                                            | ◐      | Works; **no THERAPY_CATEGORIES select**                                                                                                                                  |
| Therapist Directory / Clients                          | —                                                                                                      | ✅      | Shared + terms                                                                                                                                                           |
| **Session Notes**                                      | `/session-notes`                                                                                       | ◐      | API full CRUD; **UI create+list only, no edit/delete**; spa field model (oils/pressure/"Guest"); client fns live in `lib/api/spa.ts`; Feature renders `null` when locked |
| **Client Progress**                                    | `/progress-tracking`                                                                                   | ◐      | Read-only aggregate of session notes — **not metric CRUD**; no `progress_tracking` table/module; analytics proxy unused                                                  |
| **Intake & Consent**                                   | `/consent-forms`                                                                                       | ◐      | CRUD works behind `clinical`; therapy falls through to `{general}` type only                                                                                             |
| Client Retention                                       | `/loyalty`                                                                                             | ✅      | Loyalty CRUD; page title not relabeled                                                                                                                                   |
| Session Packages                                       | `/packages`                                                                                            | ✅      | CRUD; title generic                                                                                                                                                      |
| Reviews / Referrals                                    | —                                                                                                      | ✅/◐    | Shared; gates                                                                                                                                                            |
| Session Billing                                        | `/pos`                                                                                                 | ◐      | POS works; title "POS"                                                                                                                                                   |
| Payments Demo                                          | `/payments-demo`                                                                                       | ◐      | Stub, barber copy                                                                                                                                                        |
| Field Operations                                       | `/field-operations`                                                                                    | ◐/⛔    | Mobile page, odd for therapy                                                                                                                                             |
| Room Rental                                            | `/seat-rental`                                                                                         | ◐      | **Nav gate** `multi_branch` **vs page config** `staff_commissions_payroll` **— conflicting keys**                                                                        |
| Team Chat / System                                     | —                                                                                                      | ✅      | Shared                                                                                                                                                                   |
| THERAPY_CATEGORIES / demo / seed / E2E                 | —                                                                                                      | ✗      | None (`therapy.go` absent; zero specs; spa-advanced spec touches session-notes as spa org only)                                                                          |
| SOAP / Mood / Telehealth                               | `/clinical/*`                                                                                          | ✗      | Prototype orphans                                                                                                                                                        |


**Gaps ranked:**

- **P1-T1** Progress tracking wrong model — build `progress_tracking` (metric_name/metric_value) migration + CRUD API + UI.
- **P1-T2** Session notes UX — edit/delete UI (API exists), therapy-appropriate fields, graceful locked state.
- **P1-T3** Nav gate hardening for therapy.json (`therapy_notes`, `clinical`, `loyalty`, `marketing`, …).
- **P1-T4** Therapy demo seed.
- **P1-T5** Therapy E2E (nav-truth + notes/consent flows).
- **P2-T6** THERAPY_SERVICE_CATEGORIES in `mode-crud-configs.ts`.
- **P2-T7** Therapy consent/intake form types.
- **P2-T8** Seat-rental feature key mismatch fix.
- **P2-T9** Page-title relabels (Session Billing / Client Retention / Session Packages).
- **P2-T10** Remove Payments Demo + Field Operations from therapy nav.
- **P2-T11** Delete/retire legacy analytics proxies (`/analytics/session-notes`, `/analytics/progress-tracking`).
- **P2-T12** Move session-notes client API out of `lib/api/spa.ts` (shared module).
- **P3** SOAP/mood/telehealth decision, therapy dashboard widgets, note↔booking links in UI, public book therapy demo, palette entries.

---

### 2.5 Solo-Pro (`solo_pro` · Haus of Solo Pro · theme-solo, amber `38 92% 50%`)

**Prototype surface (with fallback caveat):** effective nav = **BARBER_NAV** (48 items / ~34 paths, barber labels — "My Chair", "Barbershop Services"). Solo-specific layers that DO exist: `MODE_TERMS.solo_pro` (My Services / My Profile / My Bookings / My Schedule / Workspace), theme-solo, brand, marketing funnel (Platforms specialty links `category=solo_pro&specialty=…`, portal select, auth `portal=solo`), pricing SKU 999 + marketing feature list, demo datasets (`DEMO_SERVICES.solo_pro` = Consultation/Standard/Premium, 100%-commission staff, "Solo 5-Pack"), ServicesPage categories `[consultation, service, premium]`. Prototype bugs: FE plan hierarchy omits `solo_pro` (gated items never unlock on solo plan); onboarding has no solo_pro card; SelectPlan lacks Solo Pro plan card. `MobileSoloProDashboard` ≠ solo_pro (mobile staff only).

**Charm2:** deliberate **thin** `solo_pro.json` (10 items: My Dashboard/Bookings/Schedule/Clients/Services/Earnings + POS + Loyalty + Settings/Support) — documented redesign in `plans/00-scope-and-product.md`. Terms/theme/pricing/planHierarchy all correct. Charm2 SelectPlan includes Solo Pro card (better than prototype).

**Inventory + status:**


| Item                                                | Status           | Note                                                                                                                               |
| --------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Terms / theme / brand / pricing 999 / planHierarchy | ✅                | Contracts parity; hierarchy better than prototype                                                                                  |
| Thin solo nav                                       | ✅ (design delta) | Intentional; drops ~24 BARBER_NAV paths (reports, finance, waitlist, queue, reviews, notifications, marketing, tips…)              |
| `/dashboard`                                        | ◐                | Shared exec dashboard; no solo workspace UX (prototype also generic)                                                               |
| `/bookings`, `/schedule`, `/clients`                | ✅                | Shared                                                                                                                             |
| `/services`                                         | ◐                | No solo taxonomy (consultation/service/premium)                                                                                    |
| `/my-earnings`                                      | ⛔                | Page requires `staff_commissions_payroll` (enterprise) while advertised on solo nav                                                |
| `/pos`                                              | ◐                | Works if `pos_payments` on; solo plan won't have it by default — **marketing PLAN_CATALOG claims POS on Solo Pro**                 |
| `/loyalty`                                          | ◐                | Works (`loyalty` default true); nav ungated                                                                                        |
| `/settings`, `/support`                             | ✅                | Shared                                                                                                                             |
| **Register specialty flow**                         | ⛔                | `register/page.tsx:80-82`: solo_pro + specialty → `businessType = specialty` — org created as barber/beauty/etc., **not solo_pro** |
| get-started / marketing funnel                      | ✅/◐              | solo_pro selectable; specialty passthrough buggy per above                                                                         |
| Features with `minPlan: solo_pro`                   | ✗                | Zero entries; solo plan relies on `default: true` cores                                                                            |
| `staffPageTitle: "My Profile"`                      | ✗                | Terms orphan — no `/staff` in solo nav                                                                                             |
| Solo seed / E2E                                     | ✗                | Neither                                                                                                                            |
| MobileSoloProDashboard port                         | N/A              | Prototype never wired it to solo_pro — not a parity item                                                                           |


**Gaps ranked:**

- **P1-S1** Register bug: persist `business_type = solo_pro`, store specialty separately.
- **P1-S2** Solo demo seed (`solo.go`).
- **P1-S3** My Earnings broken on solo plan — solo-safe earnings view or feature key change.
- **P1-S4** POS marketing vs entitlement: align `pos_payments` availability with Solo Pro plan claims (or fix marketing copy).
- **P2-S5** No solo dashboard branch (product decision needed; prototype also generic — do not invent MobileSolo as solo truth).
- **P2-S6** `/staff` "My Profile" terms orphan — add page or drop term.
- **P2-S7** Solo service taxonomy.
- **P2-S8** Gate Loyalty in solo nav (`loyalty`).
- **P2-S9** Decide thin-nav omissions (waitlist/queue/reviews/notifications were available to solo in prototype fallback) — keep thin or restore operator essentials.
- **P2-S10** Solo E2E (`solo-nav-truth`) + auth helper.
- **P3** `minPlan: solo_pro` feature entries / seat limits, packages/gift-cards quick links, in-app category toggle, select-plan platform picker, MobileSoloProDashboard rename upstream.

---

### 2.6 Products (`products` · Haus of Products · theme-products, amber `25 85% 55%`)

**Prototype surface:** `PRODUCTS_NAV` = 67 entries / ~36 unique paths / 10 sections with role hubs (Store Floor / Till / Sales Floor). Differentiators:

- **ProductsDashboard** (`DashboardPage.tsx:297-298` when `isProductsOnly`): today's sales, avg basket, pending online orders, low stock, stock value, daily target, top sellers, cashier leaderboard, quick actions.
- **Public Haus Shop storefront** (`/shop/`*): home, category, PDP (variants, cart, wishlist), brand, bundles, wishlist, CartDrawer, checkout (pickup/delivery, M-Pesa/COD/gift card → `addOrder()`), order-success. `lib/shop.ts` = demo catalog + localStorage cart/orders.
- **Online Orders** (`/shop-orders`): fulfillment queue over shop orders, status advance pending→fulfilled, cancel, toasts.
- Catalogue: retail products CRUD, Price Lock (read-only locked service prices banner), Consumption (shrinkage flags), Suppliers (aggregated ledger, non-functional buttons).
- Orphans (palette-only localStorage): barcode scanner/labels, stock take, purchase orders, wastage, transfers, variants, product reviews, cross-sell, expiry, batch/lot, prescriptions.
- **Prototype lacks** `.theme-products` **CSS** — charm2 fixed this.

**Charm2 nav/terms/theme:** `nav/products.json` 1:1. Terms exact. `.theme-products` present (globals.css 188–199) — ahead of prototype.

**Inventory + status:**


| Item                                                                                     | Path                                                  | Status | Note                                                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| **Store Dashboard**                                                                      | `/dashboard`                                          | ◐      | Salon-generic + terms; no ProductsDashboard KPIs/role hubs                               |
| **Online Orders**                                                                        | `/shop-orders`                                        | ✗      | Explicit stub ("will be wired…"); no Go module; `shop_orders` feature key unused         |
| **Public storefront**                                                                    | `/shop/`*                                             | ✗      | No public shop routes at all (`(public)/` = book + get-started); no cart/checkout/orders |
| Product Catalogue                                                                        | `/retail-products`                                    | ✅      | Real CRUD (`retail` module, `inventory_tracking`)                                        |
| Price Lock                                                                               | `/price-lock`                                         | ◐      | Entity CRUD ≠ locked-menu enforcement UX; gate mismatch vs nav `pos_payments`            |
| Consumption                                                                              | `/consumption`                                        | ◐      | Log CRUD ≠ shrinkage tracker                                                             |
| Suppliers                                                                                | `/suppliers`                                          | ✅      | Real CRUD (better than prototype fake ledger)                                            |
| Stock on Hand                                                                            | `/inventory`                                          | ✅      | CRUD + stock_ops                                                                         |
| Stock Take / Purchase Orders                                                             | `/inventory/stock-take`, `/inventory/purchase-orders` | ✅      | Real API-backed (beyond prototype LS) — but **not in products nav**                      |
| POS / Till                                                                               | `/pos`                                                | ✅      | Shared POS with products support                                                         |
| Payments Demo                                                                            | `/payments-demo`                                      | ◐      | Stub                                                                                     |
| Reconciliation                                                                           | `/reconciliation`                                     | ✅      | Money loop                                                                               |
| Branches / Reports / Finance / Commissions / Payroll / Audit / Forecast                  | —                                                     | ✅/◐    | Shared; forecast retail semantics weak                                                   |
| Staff / QR / Clients / My Earnings                                                       | —                                                     | ✅      | Shared + terms (Cashier/Sales Associate)                                                 |
| Loyalty / Gift Cards / Promotions / Referrals / WhatsApp / Marketing / Gallery / Reviews | —                                                     | ✅/◐    | Shared; reviews are service reviews not product reviews; gate drift                      |
| Bundles & Kits                                                                           | `/packages`                                           | ◐      | Marketing packages ≠ shop kits/bundles                                                   |
| Team Chat / Haus Connect / Branding / System                                             | —                                                     | ✅      | Shared                                                                                   |
| Products seed / E2E                                                                      | —                                                     | ✗      | No products org (only 2 retail SKUs on barber demo, `main.go:337-369`); zero specs       |
| Palette orphans (variants/expiry/barcode/wastage/transfers/cross-sell/batch-lot/Rx)      | —                                                     | ✗      | Prototype LS orphans                                                                     |


**Gaps ranked:**

- **P1-P1** Public Haus Shop storefront (`/shop/`* org-scoped, cart, checkout) — the mode's defining loop.
- **P1-P2** Online orders backend module + real `/shop-orders` queue UI, feature `shop_orders`.
- **P1-P3** ProductsDashboard (retail KPIs, cashier hub, quick actions) branch for products orgs.
- **P1-P4** Products demo seed + products E2E.
- **P2-P5** Price Lock enforcement UX in POS (vs bare CRUD).
- **P2-P6** Consumption shrinkage view.
- **P2-P7** Bundles & Kits = product kits, not session packages.
- **P2-P8** Nav gates (`shop_orders` on Online Orders; Growth items).
- **P2-P9** Stock ↔ POS ↔ shop decrement/fulfillment loop.
- **P2-P10** Remove Payments Demo from nav; wire stock-take/POs INTO products Catalogue nav (already built).
- **P3** variants, product reviews, cross-sell, expiry, batch/lot, prescriptions, barcode scan/labels, wastage, transfers, pharmacy specialty.

---

## 3. Phase-by-phase implementation plan

Ordering principle: truth/safety first (cheap, unblocks QA), then per-mode differentiators grouped by shared infrastructure, heaviest net-new build last. Effort scale: S < M < L < XL (relative).

---

### Phase 0 — Truth & safety fixes (all modes)

**Scope:**

- Fix solo register bug: persist `business_type = solo_pro`, store specialty separately (P1-S1). Same mechanism reused later by mobile specialty (P1-M1) — design the org `specialty` column here.
- Fix `coverage_zones` schema/query mismatch in analytics repo (stop the broken SELECT) (part of P1-M2).
- Nav gate hardening across all six `nav/*.json`: add `requiredFeature` matching page/API gates (loyalty, marketing, clinical, therapy_notes, tips_management, qr_clock, advanced_analytics, inventory_tracking, multi_branch, staff_commissions_payroll, queue, customer_reviews, shop_orders) (P1-N3, P1-A5, P2-M6, P1-T3, P2-S8, P2-P8).
- Remove `/payments-demo` from all six navs; remove `/field-operations` from nail/clinic/therapy navs (P1-N4/N5, P2-A8, P2-T10).
- Fix therapy seat-rental key conflict (P2-T8). Fix solo my-earnings + POS entitlement story (P1-S3/S4).
- Regenerate e2e nav routes (`npm run generate:e2e-routes`); keep `features.json` synced both copies.

**Dependencies:** none. **Effort:** M. 
**Done when:** every nav item in the six mode JSONs either has no server gate or carries the matching `requiredFeature`; solo signup creates a `solo_pro` org (manual verify); no mode nav contains payments-demo or a foreign-mode page; contracts CI check green.

### Phase 1 — Seeds + nav-truth E2E (all six modes)

**Scope:**

- `apps/api/cmd/seed/`: add `nails.go`, `clinic.go`, `mobile.go`, `therapy.go`, `solo.go`, `products.go` demo orgs mirroring `beauty.go`/`spa.go` pattern (staff, clients, mode taxonomy services, mode-relevant features enabled, demo content: nail gallery, clinic consumables, mobile zones, therapy packages, retail SKUs/bundles).
- E2E helpers `e2e/helpers/{nails,clinic,mobile,therapy,solo,products}-auth.ts` (copy spa-auth pattern); specs `<mode>-nav-truth.spec.ts` per mode; wire all in `playwright.config.ts`.
- Add mode service taxonomies to `mode-crud-configs.ts`: NAIL_BAR, CLINIC, MOBILE, THERAPY, SOLO categories (P2-N6, P2-A7 taxonomy half, P2-M10, P2-T6, P2-S7).

**Dependencies:** Phase 0 (gates must be correct or nav-truth asserts wrong reality). **Effort:** L. 
**Done when:** `go run ./cmd/seed` creates all six demo orgs; `E2E_PROD=1 npm run test:e2e` runs six nav-truth suites green; each mode's services page offers its taxonomy dropdown.

### Phase 2 — Clinical parity (aesthetics + therapy)

**Scope:**

- Patient Intake: migration + org-scoped CRUD module + UI behind `clinical` (P1-A1).
- Aftercare: persisted templates/instructions CRUD (P1-A2); retire analytics proxies (aftercare, patient-intake, session-notes, progress) (P2-T11).
- Consent form types per mode: clinic liability set (botox/fillers/laser/peel) + signed/pending state; therapy intake/medical/counselling; nails gel/acrylic/chemical-allergy; page titles follow nav labels (P1-A3, P2-T7, P2-N7).
- Session Notes: edit/delete UI, therapy-appropriate fields, locked-state fallback, move API client out of `lib/api/spa.ts` (P1-T2, P2-T12).
- Progress Tracking: `progress_tracking` migration + metric CRUD API + UI (P1-T1).
- Wire `/client-consultations`, `/client-patch-tests`, `/client-photos`, `/resources` into clinic nav (P2-A6, P2-A9).

**Dependencies:** Phase 1 (clinic/therapy seeds + E2E harness to prove flows; org-A/org-B isolation tests per endpoint). **Effort:** XL. 
**Done when:** clinic org can create/edit/delete intake records, aftercare templates, typed consent forms; therapy org can edit/delete session notes and CRUD progress metrics; all behind correct feature keys; clinical E2E specs green; no analytics-proxy pages remain in these navs.

### Phase 3 — Mobile dispatch parity

**Scope:**

- `mobileSpecialty` end-to-end: org specialty column (from Phase 0 design), server-side term/category resolution in `/me`, settings UI, get-started/register wiring (P1-M1).
- Coverage Zones: CRUD API (name/city/radius_km/surcharge) + zone-cards UI under `coverage_zones` (P1-M2).
- Dashboard branches: dispatch board (managers) + mobile hub (staff), bookings-backed (P1-M3).
- Field Operations v1: job statuses (en_route/on_site/done), staff assignment, booking links (P1-M5).
- Home-visit address/zone in booking + public book (P2-M7); `mobile-floor-ops.spec.ts` (P2-M9).

**Dependencies:** Phase 0 (schema fix, specialty column), Phase 1 (mobile seed). Independent of Phase 2 — can run in parallel with it. **Effort:** XL. 
**Done when:** mobile demo org shows specialty-resolved terms, CRUDs zones, dispatch/hub dashboards render for respective roles, field job statuses advance, floor-ops E2E green.

### Phase 4 — Products commerce loop

**Scope:**

- Shop/orders Go module: order model, org-scoped CRUD, status machine (pending→ready→fulfilled/cancelled), stock decrement on fulfillment; feature `shop_orders` (P1-P2, P2-P9).
- `/shop-orders` real queue UI replacing stub.
- Public storefront `/shop/[orgSlug]`: catalog/category/PDP/cart/checkout (pickup/delivery; Pesapal or pay-on-pickup), org-token scoping like public booking (P1-P1).
- ProductsDashboard branch for products orgs (retail KPIs, pending orders, low stock, top sellers) (P1-P3).
- Bundles & Kits semantics on packages for products mode (P2-P7); price-lock POS enforcement (P2-P5); consumption shrinkage view (P2-P6); stock-take/POs added to products Catalogue nav (P2-P10); `products-floor-ops.spec.ts`.

**Dependencies:** Phase 0 + Phase 1 (products seed). Payment path reuses existing Pesapal module. Parallelizable with Phases 2–3 apart from seed dependency. **Effort:** XL (largest net-new build). 
**Done when:** customer can browse seeded shop, checkout, order appears in `/shop-orders`, staff advances status, stock decrements, dashboard shows retail KPIs; storefront + orders E2E green (skip live Pesapal).

### Phase 5 — Polish & floor-ops depth (all modes)

**Scope:**

- Page-title relabels honoring nav terms (Allergy Forms, Nail Art Gallery, Session Billing, Client Retention, Session Packages, Bundles & Kits) (P2-N8 title half, P2-T9).
- Gallery before/after pairing UX (nails/clinic) (P2-N8, P2-A10-adjacent).
- Solo dashboard decision + solo workspace polish; restore/confirm thin-nav omissions (P2-S5/S6/S9).
- Bring nails (and other modes as decided) up to charm2 hardened-floor standard: waitlist, deposits, time-off/shift-swap, pos/tabs into mode navs where product wants them (P2-N10).
- Remaining floor-ops/growth E2E per mode (`<mode>-floor-ops`, `<mode>-growth` following beauty/spa pattern).

**Dependencies:** Phases 0–4 (relabels touch pages built earlier; E2E needs seeds and features). **Effort:** L. 
**Done when:** nav label ↔ page title consistent across six modes; per-mode floor-ops suites green; each mode's audit P1+P2 list closed or explicitly deferred with a product decision recorded.

**Suggested sequencing:** 0 → 1 → {2 ∥ 3 ∥ 4} → 5. Phases 2/3/4 are independent workstreams after seeds land.

#### Phase 5 decisions (recorded)

| Item | Decision |
|------|----------|
| Allergy Forms title | Already mode-aware on consent-forms (nails) — no change. |
| Bundles & Kits title | Already done in Phase 4 (`packages` → kitsConfig for products) — confirmed. |
| Nail Art Gallery / Session Billing / Client Retention / Session Packages | Implemented: mode-aware page titles on gallery, POS, loyalty, packages. |
| Gallery before/after pairing | Implemented: `after_image_url` + upload `?slot=before\|after` + pairing UX for nails/clinic. |
| Solo dashboard | **Build dedicated `SoloProDashboard`** (today strip + next appointment + earnings + quick POS) — not the shared exec charts. |
| Solo thin-nav | **Keep thin by design** — omit waitlist/queue/reviews/notifications from `solo_pro` nav; pages remain deep-linkable. |
| Nails hardened floor | **In nav:** waitlist, booking-deposits, tech time-off, shift-swap, open tabs (`pos/tabs`). Waitlist already had CustomerPicker. |
| Per-mode `*-growth` E2E | **Deferred** for nails/clinic/therapy/solo/mobile/products — beauty/spa growth + shared `phase4-growth` already cover growth surfaces; mode floor-ops cover differentiators. |

---

## 4. Enhancement backlog (optional — NOT parity work, do not mix into phases)

Ideas surfaced during audit, explicitly out of scope for gap-fill:

**Nails**

- Station resource booking (reuse spa `resource_booking`) for double-booking prevention.
- Gel-cure / buffer defaults per category; patch-test flags on acrylic/gel services (reuse beauty `requires_patch_test`).
- Client photo timeline for nail-art history; walk-in SMS wait estimates.

**Aesthetics**

- Photo consent + watermarked before/after gallery tied to patient + procedure.
- Lot/expiry tracking for toxin/filler vials; cooling/patch-test booking holds.
- Procedure protocol library (contraindications checklists); practitioner credential-expiry fields; public-booking medical questionnaire step; digital signature capture; telehealth/prescriptions only if product wants regulated med-spa scope.

**Mobile**

- Specialty as first-class editable org setting; auto travel surcharge from zone at booking; staff↔zone assignments; offline-first PWA sync queue for field staff; Google Maps wiring for `CoverageMap.tsx`; route optimization / ETA SMS / job photo proof / fuel log (prototype palette orphans).

**Therapy**

- SOAP template as optional `note_type` on session notes; client-portal mood check-ins; telehealth as booking-link integration (Meet/Zoom), not video UI; package remaining-sessions widget; session rooms via `resources`.

**Solo-Pro**

- True solo workspace shell (today strip + earnings + next appointment + one-tap POS); specialty-aware service packs; 1-seat enforcement on solo plan; `minPlan: solo_pro` feature entries; upstream rename of `MobileSoloProDashboard` to kill the naming trap.

**Products**

- Real product images via MinIO + Pesapal checkout on shop (beyond prototype localStorage); POS barcode scan to cart; price-lock enforcement in POS discount path w/ manager PIN; `/reports/retail-summary` API for dashboard; variants / product reviews / cross-sell / expiry / batch-lot / prescriptions / wastage / transfers as later retail-ops modules.

---

## 5. Source notes

Key evidence paths (charm2 unless prefixed prototype):


| Topic                                | Path                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Prototype navs                       | `../barber-house-charm/src/components/AppLayout.tsx` 221–500, modeMap 505–515                                                                 |
| Prototype terms/specialty            | `../barber-house-charm/src/hooks/useBusinessCategory.tsx`                                                                                     |
| Charm2 nav manifests                 | `packages/contracts/domain/nav/{nail_bar,clinic,mobile,therapy,solo_pro,products}.json`                                                       |
| Terms / themes                       | `packages/contracts/domain/mode-terms.json` · `apps/web/app/globals.css` 123–199                                                              |
| Analytics proxies                    | `apps/api/internal/modules/analytics/modes.go` (intake 19–27, aftercare 38–50, notes 61–72, progress 82–95, zones 105–118, field ops 129–141) |
| Coverage zones schema                | `infra/migrations/000002_modules.up.sql` 94–107                                                                                               |
| Therapy module                       | `apps/api/internal/modules/therapy/` · `infra/migrations/000019_spa_resources.up.sql` 23–42                                                   |
| Consent type fallthrough             | `apps/web/app/(dashboard)/consent-forms/page.tsx` 49–50, 149                                                                                  |
| Solo register bug                    | `apps/web/app/(auth)/register/page.tsx` 80–105                                                                                                |
| Shop-orders stub                     | `apps/web/app/(dashboard)/shop-orders/page.tsx` 6–24                                                                                          |
| Seeds (3 of 9 modes)                 | `apps/api/cmd/seed/{main,beauty,spa}.go`                                                                                                      |
| E2E wiring                           | `apps/web/playwright.config.ts` ~52                                                                                                           |
| Prior mode audits (format precedent) | `docs/haus-of-{barber,beauty,spa}-audit-and-plan.md`                                                                                          |


