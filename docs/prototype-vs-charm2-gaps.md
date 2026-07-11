# Production Deployment Gaps

**Scope:** What blocks full production deploy in `barber-house-charm2` — by module, view, and menu item.  
**Not in scope:** Prototype parity / missing Vite routes.  
**Date:** 2026-07-11

---

## Deploy readiness snapshot

| Layer | Count | Status |
|-------|-------|--------|
| Dashboard nav routes (union) | 52 | All have pages; **8 are placeholder or partial** |
| Client portal routes | 10 | **3 not production-grade** (wallet, notifications, reschedule E2E) |
| Platform admin routes | 5 | **2 stubs** (dashboard, payouts) |
| Auth / public routes | 9 | ✅ Wired (email verify, invites, client `/home`) |
| Go API modules | 20 | **4 integration layers stubbed** |
| E2E specs | 27+ | Smoke on all nav routes; **behavioral gaps** on shop, reconciliation, portal wallet |

**Verdict:** Core barber/beauty/spa **ops loop** (bookings, queue, staff, CRM, POS UI, ledger) is deployable for **pilot tenants** once P0 env + bugs fixed. **Cannot** take live payments, send SMS/WhatsApp, run SaaS billing, or ship products/mobile/clinical modes as advertised.

---

## P0 — Blocks money & notifications

| Blocker | Location | Gap |
|---------|----------|-----|
| **Pesapal collect** | `integrations/pesapal/client.go` | Stub redirect + fake IPN — no live checkout |
| **OpenFloat disburse** | `integrations/openfloat/client.go` | Stub disburse — payouts not real |
| **SMS** | `notifications/sms.go` | Africa's Talking stub |
| **WhatsApp** | `notifications/whatsapp.go` | Meta Cloud API stub |
| **SMTP** | `compose.yml` / `config.go` | Defaults to MailHog / `LogSender`; prod needs `SMTP_*`, `EMAIL_DRY_RUN=false` |
| **Tenant billing** | `/select-plan` | Plan switch is free — no subscription payment flow |
| **Payments Demo** | `/payments-demo` | Explicit “no API calls” — **hide in prod nav** |

---

## P0 — Deployment env checklist

Before go-live, wire and verify:

- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_STARTTLS`, `EMAIL_FROM`, `PUBLIC_WEB_URL`
- `PESAPAL_*` (consumer key, secret, IPN URL, callback)
- `OPENFLOAT_*` (disburse credentials)
- `AT_API_KEY` / Africa's Talking sender ID
- `META_WHATSAPP_*` (token, phone number ID)
- `JWT_SECRET`, cookie domain, HTTPS
- Object storage (`S3_*` / R2) for gallery/branding uploads
- Redis + Postgres backups, migration `000009` applied

---

## Dashboard menu — module gap matrix

Legend: **FE** = frontend · **API** = backend · **E2E** = behavioral test beyond smoke

| Menu path | Section / mode | FE | API | E2E | Production gap |
|-----------|----------------|----|-----|-----|----------------|
| `/dashboard` | Executive | ✅ | ✅ analytics | ✅ flows | KPI targets partly hardcoded |
| `/branches` | Executive | ✅ | ✅ tenancy | smoke | No branch lifecycle E2E; `multi_branch` not on nav gate |
| `/reports` | Executive | ✅ | ✅ SQL aggregates | ✅ | Needs prod data validation |
| `/finance` | Executive | ✅ | ✅ ledger | ✅ | Payouts depend on **stub OpenFloat** |
| `/commissions` | Executive | ✅ | ✅ payroll | ✅ | Audit with real txn volume |
| `/payroll` | Executive | ✅ | ✅ payroll | ✅ | No tax/export compliance |
| `/audit-log` | Executive | ✅ | ✅ platform audit | ✅ major-updates | **May be empty** — booking/payment events not always logged |
| `/qr-attendance` | Executive | ✅ | ✅ staff QR | ✅ staff-portal | QR rotation / print workflow not E2E'd |
| `/scorecards` | Executive | ✅ | ⚠️ partial | ✅ | **Hardcoded** punctuality 85% / retention 72% in SQL |
| `/call-centre` | Executive | ✅ | ✅ enquiry stats | ✅ | Stats only — no telephony |
| `/schedule` | My Chair / ops | ✅ | ✅ booking | ✅ | Calendar range bug (~8am–5pm not full day) |
| `/bookings` | My Chair / ops | ✅ | ✅ booking | ✅ | Staff cannot search client + full book wizard; conflict load untested |
| `/waitlist` | Branch / ops | ✅ | ✅ | ✅ | Form asks raw **UUID** — bad prod UX |
| `/queue` | Branch / ops | ✅ | ✅ derived | ✅ | Needs WebSocket reliability in prod |
| `/pos` | Sales | ✅ | ✅ pos | ✅ | **No live payment**; appointment strip missing name/service/price/barber |
| `/payments-demo` | Sales | ⚠️ stub UI | ❌ | smoke | **Remove from prod** |
| `/clients` | Services | ✅ | ✅ crm | ✅ CRUD | Low gap |
| `/client-ownership` | Services | ✅ | ✅ crm | ✅ | Assignment mutations limited |
| `/services` | Services | ✅ | ✅ | ✅ CRUD | No mode category taxonomy in contracts |
| `/staff` | Services | ✅ | ✅ + invites | ✅ | Invite email needs SMTP |
| `/marketing` | Growth | ✅ | ✅ | ✅ CRUD | **Send** uses stub SMS/WhatsApp |
| `/promotions` | Growth | ✅ | ✅ | ✅ CRUD | Low |
| `/referrals` | Growth | ✅ | ✅ | ✅ CRUD | **Copy code / logic unverified** |
| `/loyalty` | Growth | ✅ | ✅ | ✅ CRUD | Low |
| `/packages` | Growth | ✅ | ✅ | ✅ CRUD | Low |
| `/gift-cards` | Growth | ✅ | ✅ | ✅ CRUD | Low |
| `/reviews` | Growth / staff | ✅ | ✅ | ✅ | **Submitted reviews may not surface**; tie to completed visits |
| `/gallery` | Growth | ✅ | ✅ settings | ✅ CRUD | **URL-only** — no MinIO/R2 upload UI |
| `/inventory` | Inventory | ✅ | ✅ | ✅ CRUD | Low |
| `/consumption` | Inventory | ✅ | ✅ | ✅ CRUD | Low |
| `/suppliers` | Inventory | ✅ | ✅ | ✅ CRUD | Low |
| `/retail-products` | Inventory / products | ✅ | ✅ retail | ✅ CRUD | Low |
| `/price-lock` | products mode | ✅ | ✅ | ✅ CRUD | Admin UX needs valid entity UUIDs |
| `/shop-orders` | products / mobile | ⚠️ **placeholder** | ❌ **no module** | smoke | **Full e-commerce backend missing** |
| `/reconciliation` | beauty / products | ⚠️ **placeholder** | ❌ | smoke | Links to finance — **no reconciliation API** |
| `/tips` | Operations | ✅ | ✅ pos extras | ✅ | Nav ungated; registry ties to `pos_payments` |
| `/revenue-forecast` | Operations | ✅ | ⚠️ minimal | ✅ | Bookings field always 0 in forecast |
| `/field-operations` | mobile | ⚠️ partial | ⚠️ read-only | ✅ | Routes/Zones tabs **stub copy** |
| `/coverage-zones` | mobile | ⚠️ JSON dump | ⚠️ GET only | ✅ | **No zone CRUD API** despite DB table |
| `/staff-chat` | Operations | ✅ | ✅ settings | ✅ | **Messages may not persist in thread**; polling only |
| `/whatsapp` | System | ✅ log viewer | ⚠️ logs only | smoke | **Cannot send** — Meta stub |
| `/branding` | System | ✅ | ✅ | ✅ | Logo likely URL-only |
| `/seat-rental` | System (barber) | ✅ | ✅ | ✅ CRUD | Nav gate `multi_branch` vs API `staff_commissions_payroll` **mismatch** |
| `/notifications` | System | ✅ inbox | ✅ inbox | smoke | In-app inbox ≠ SMS/push delivery |
| `/settings` | System | ✅ | ✅ 2FA | ✅ twofa | 2FA + verify need prod SMTP |
| `/support` | System | ✅ | ✅ enquiries | smoke | No ticket SLA / helpdesk |
| `/my-earnings` | My Chair | ✅ | ✅ | ✅ | Requires user→staff link |
| `/qr-clock` | My Chair | ✅ | ✅ | ✅ | Nav ungated vs `qr_clock` feature |
| `/patient-intake` | clinic | ⚠️ analytics JSON | ⚠️ customer proxy | smoke | **Not clinical workflow** |
| `/aftercare` | clinic | ⚠️ analytics JSON | ⚠️ booking proxy | smoke | **Not clinical workflow** |
| `/consent-forms` | clinic | ✅ | ✅ | ✅ CRUD | Only real clinical CRUD |
| `/session-notes` | therapy | ⚠️ analytics JSON | ⚠️ notes proxy | smoke | **No session-notes schema/write API** |
| `/progress-tracking` | therapy | ⚠️ analytics JSON | ⚠️ visit proxy | smoke | **No therapy progress model** |

### Orphan pages (not in nav manifest)

| Path | FE | API | Gap |
|------|----|-----|-----|
| `/wallet` | ✅ | ✅ ledger | Not in contracts nav — operators won't find it |
| `/home` | ✅ client marketplace | ✅ `/public/orgs` | Client-only; needs curated org catalog |

---

## Client portal — menu gaps

| Path | FE | API | E2E | Production gap |
|------|----|-----|-----|----------------|
| `/portal` | ✅ | ✅ | ✅ | Low |
| `/portal/book` | ✅ | ✅ | ✅ | Name/phone should pre-fill from logged-in client |
| `/portal/bookings` | ✅ | ✅ | ✅ | Low |
| `/portal/reschedule` | ✅ | ✅ booking update | ❌ | **No dedicated E2E** |
| `/portal/wallet` | ⚠️ | partial loyalty | ❌ | **Transactions in localStorage only** |
| `/portal/notifications` | ⚠️ | ❌ | ❌ | **Prefs in localStorage only** |
| `/portal/loyalty` | ✅ | ✅ | ✅ | Low |
| `/portal/reviews` | ✅ | ✅ | ✅ | Same review visibility bug as dashboard |
| `/portal/referrals` | ✅ | ✅ | ✅ | Low |
| `/portal/profile` | ✅ | ✅ | ✅ | Low |

---

## Auth & onboarding (non-nav)

| Route | FE | API | E2E | Production gap |
|-------|----|-----|-----|----------------|
| `/` marketing | ✅ | — | ✅ | Hero is static — no industry tabs |
| `/login` | ✅ | ✅ | ✅ | Handles 2FA challenge |
| `/register` | ✅ | ✅ verify | ✅ | Staff self-reg blocked ✅ |
| `/verify-email` | ✅ | ✅ | ✅ | Needs prod SMTP |
| `/accept-invite` | ✅ | ✅ | ✅ | Needs prod SMTP |
| `/get-started` | ✅ | — | ✅ | No `/platforms` Haus picker page |
| `/home` | ✅ | ✅ public orgs | ✅ | Branch-level discovery weak vs full marketplace |
| `/select-plan` | ✅ | ✅ patch plan | ✅ | **No payment** for SaaS subscription |
| `/book/[orgSlug]` | ✅ | ✅ public booking | ✅ | No generic `/book` without slug |
| `/onboarding` | ❌ | ❌ | ❌ | **Post-signup wizard missing** — tenants can't self-provision branch/hours/services |
| `/reset-password` | ❌ | partial? | ❌ | **Forgot-password flow missing** |

---

## Platform admin (`/admin/*`)

| Path | FE | API | E2E | Production gap |
|------|----|-----|-----|----------------|
| `/admin` | ⚠️ stub card | health only | smoke | Needs real ops dashboard |
| `/admin/tenants` | ✅ | ✅ list orgs | smoke | No provision/suspend UX |
| `/admin/subscriptions` | ✅ | ✅ | smoke | No billing tie-in |
| `/admin/features` | ✅ kill-switch | ✅ | smoke | Beta feature `platform_admin` |
| `/admin/payouts` | ⚠️ placeholder | ❌ | smoke | **No platform payout oversight API** |

---

## Known live bugs (pages exist, behavior broken)

From QA / `major_updates.md` — fix before pilot:

| Area | Bug |
|------|-----|
| Reviews | Submissions may not appear; must link to completed booking/transaction |
| Referrals | Copy/share code flow missing or broken |
| Portal book | Logged-in client name/phone not pre-filled |
| Staff bookings | Cannot search customer by name and complete full booking wizard |
| Schedule | Should show midnight–midnight, not ~8am–5pm |
| Staff chat | Send confirms but message missing from thread |
| POS | Today's appointments strip missing customer, service, price, barber |
| Audit log | Often empty — clock-in, bookings, payments not logged |
| App shell | Sidebar scrolls with page (should be fixed independently) |

---

## E2E coverage gaps

| Area | Smoke | Behavioral E2E | Action |
|------|-------|----------------|--------|
| All 52 dashboard nav routes | ✅ | partial | Add flows for shop-orders, reconciliation, whatsapp |
| CRUD modules (16) | — | ✅ `crud-flows` | Extend when shop-orders API exists |
| Auth / onboarding | — | ✅ 5 specs | Add reset-password when built |
| Portal reschedule | — | ❌ | Add spec |
| Portal wallet / notifications | — | ❌ | Add spec after API backend |
| 2FA | — | ✅ `twofa-flows` | auth.setup handles 2FA ✅ |
| Live Pesapal / WhatsApp | — | skipped (correct) | Manual staging checklist |

---

## Mode deploy readiness

Which Haus modes can ship **as advertised** today:

| Mode | Nav contract | Core ops | Mode-specific views | Deploy? |
|------|--------------|----------|---------------------|---------|
| **barber** | `barber.json` | ✅ | Chair rental ✅ | **Pilot yes** (after P0 + bugs) |
| **beauty** | `beauty.json` | ✅ | Reconciliation placeholder | Pilot yes |
| **spa** | `spa.json` | ✅ | Shared | Pilot yes |
| **nail_bar** | `nail_bar.json` | ✅ | Shared | Pilot yes |
| **solo_pro** | `solo_pro.json` (shallow) | ✅ | Falls back barber nav | Pilot yes |
| **mixed** | `mixed.json` | ✅ | Merged nav | Pilot — validate multi-mode E2E |
| **products** | `products.json` | partial | **shop-orders stub** | **No** — storefront missing |
| **mobile** | `mobile.json` | partial | **coverage-zones, field-ops stubs** | **No** |
| **clinic** | `clinic.json` | partial | intake/aftercare are proxies | **No** — clinical compliance |
| **therapy** | `therapy.json` | partial | session-notes/progress proxies | **No** — no write API |

---

## Recommended deployment phases

### Phase 1 — Pilot (barber / beauty / spa)

1. Wire P0 env (SMTP, secrets, HTTPS, storage)
2. Fix § bugs (reviews, chat, audit, POS strip, schedule, portal pre-fill)
3. Hide `/payments-demo` in prod builds or feature-flag off
4. Run full E2E against Docker prod web (`E2E_PROD=1`)
5. Onboard tenants manually or via seed until `/onboarding` exists

### Phase 2 — Money on

1. Real Pesapal client + idempotent IPN + ledger posts
2. Real OpenFloat disburse + payout reconciliation
3. Remove payment stubs; POS checkout end-to-end in staging
4. Tenant subscription billing (M-Pesa/card) on `/select-plan`

### Phase 3 — Comms & growth

1. Africa's Talking SMS + Meta WhatsApp live senders
2. Marketing campaign send verified
3. Gallery/branding file upload to R2/MinIO
4. Public `/onboarding` wizard for self-serve tenants

### Phase 4 — Mode expansion

1. **products:** shop-orders API + public `/shop/*` storefront
2. **mobile:** coverage-zones CRUD + field dispatch API
3. **clinic / therapy:** real schemas + write APIs (not analytics proxies)
4. Platform admin payouts + tenant lifecycle

---

## Feature gate inconsistencies (fix in contracts or code)

| Item | Nav `requiredFeature` | API / registry | Risk |
|------|----------------------|----------------|------|
| `/seat-rental` | `multi_branch` | `staff_commissions_payroll` | Wrong tenants see nav vs API 403 |
| `/tips` | none | `tips_management` → `pos_payments` | Ungated nav |
| `/qr-clock` | none | `qr_clock` | Ungated nav |
| `/scorecards` | none | `advanced_analytics` | Ungated nav |

Align nav manifest, `RequireFeature` middleware, and `features.json` before prod.

---

## Source index

| Concern | Path |
|---------|------|
| Nav manifests (9 modes) | `packages/contracts/domain/nav/*.json` |
| Feature registry | `packages/contracts/domain/features.json` |
| E2E nav routes | `apps/web/e2e/generated/nav-routes.ts` |
| API module wiring | `apps/api/internal/platform/app/app.go` |
| Integration stubs | `apps/api/internal/modules/integrations/` |
| Portal nav | `apps/web/lib/portal-view.ts` |

---

*Refocused from prototype comparison to production deployment gaps. Update after each phase ships.*
