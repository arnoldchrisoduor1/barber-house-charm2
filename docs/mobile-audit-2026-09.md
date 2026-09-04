# Mobile responsiveness audit — Haus of Wellness web (`apps/web`)

**Date:** 2026-09-04  
**Branch:** `feat/mobile-responsiveness-audit`  
**Scope:** Next.js App Router under `apps/web/app/` and reusable UI under `apps/web/components/`. Haus Laundry and other repos were not touched.

This pass is layout/touch/typography only. Colors, branding, font families, and product behavior are unchanged. Desktop (`md:` / 768px and up) is preserved except where a control had to stay viewport-safe at every width (dialogs, horizontal overflow clip).

## Viewports checked in code

- Phones: 360px, 390px, 414px (below Tailwind `md`)
- Tablet: 768px (`md` — desktop sidebar and denser controls resume)

## Inventory

| Area | Files |
|------|--------|
| `apps/web/app/**/*.tsx` | 101 |
| `apps/web/components/**/*.tsx` | 58 |
| `pages/` | none (App Router only) |

Every file in those trees was reviewed. Thin CRUD pages inherit shell/table/dialog/button fixes even when the page file itself was not edited.

---

## Shared primitives (highest leverage)

These changes apply to almost every authenticated screen.

### `AppShell.tsx` — **fixed**

The 256px sidebar was always visible, which forced horizontal overflow on phones. Below `md`:

- Sidebar is hidden; a 44px hamburger opens a left drawer overlay (`app-mobile-nav`).
- Drawer closes on route change, overlay click, Escape, and the close button.
- Body scroll is locked while the drawer is open.
- Main padding is `p-4 md:p-6`; header switchers wrap.
- Shell uses `h-dvh` instead of `h-screen` so mobile browser chrome does not clip content.

### Form / overlay primitives — **fixed**

| File | Fix |
|------|-----|
| `components/ui/button.tsx` | Default / sm / icon heights are 44px below `md`, original heights from `md` up |
| `components/ui/input.tsx` | `h-11` + `text-base` on mobile (avoids iOS zoom); `md:h-10 md:text-sm` |
| `components/ui/textarea.tsx` | `text-base md:text-sm` |
| `components/ui/select.tsx` | Same height/font treatment; `min-w-0` so triggers can shrink |
| `components/ui/dialog.tsx` | Width `calc(100% - 2rem)`, `max-h-[min(90dvh,100%)]`, scroll, 44px close hit area |
| `components/ui/alert-dialog.tsx` | Same viewport-safe panel |
| `components/ui/card.tsx` | Padding `p-4 md:p-6`; titles `text-xl md:text-2xl` |
| `components/ui/star-rating.tsx` | Interactive stars use 44px hit targets |

### Header chrome — **fixed**

| File | Fix |
|------|-----|
| `HausSwitcher.tsx` / `BranchSwitcher.tsx` | Full-width triggers on small screens instead of fixed 180px |
| `PortalSwitcher.tsx` | Horizontal scroll if needed; 44px tabs on mobile |
| `ThemeToggle.tsx` | 44px icon button (`md:h-10`) |
| `UserProfileMenu.tsx` | 44px trigger; dropdown `min(18rem, 100vw - 1.5rem)` |
| `CrudModulePage.tsx` | Title + “Add new” stack on mobile; full-width CTA |
| `DataTable.tsx` | `min-w-[36rem]` + `overflow-x-auto` so tables scroll instead of squashing; larger cell padding on touch |
| `EntityForm.tsx` | Checkbox row `min-h-11` |
| `CustomerPicker.tsx` | 44px “Change” and result rows |

### Root

| File | Fix |
|------|-----|
| `app/layout.tsx` | Explicit `viewport` metadata (`width=device-width`, zoom allowed) |
| `app/globals.css` | `html { overflow-x: clip }` so stray wide children do not pan the whole app |

---

## File-by-file checklist

Legend: **fixed** = page/component-specific edits in this branch. **inherits** = no local layout bugs found; shared primitives cover it. **already ok** = already stacked/wrapped or non-visual.

### App — layouts & providers

| File | Result |
|------|--------|
| `app/layout.tsx` | **fixed** — viewport export |
| `app/providers.tsx` | already ok (no layout) |
| `app/globals.css` | **fixed** — overflow-x clip |
| `app/(dashboard)/layout.tsx` | already ok (auth gate only) |
| `app/(portal)/layout.tsx` | already ok (auth gate only) |
| `app/home/layout.tsx` | already ok (auth gate only) |
| `app/(auth)/layout.tsx` | **fixed** — `min-h-dvh`, tighter padding |
| `app/(admin)/layout.tsx` | **fixed** — wrapping nav, 44px links, stacked sign-out |

### App — marketing / auth / onboarding

| File | Result |
|------|--------|
| `app/(marketing)/page.tsx` | already ok (`overflow-x-hidden`); sections audited below |
| `app/(auth)/login/page.tsx` | **fixed** — 44px inputs, `min-h-dvh` |
| `app/(auth)/register/page.tsx` | **fixed** — 2-col Haus picker (was 3 cramped `text-[10px]` cells), 44px inputs |
| `app/(auth)/verify-email/page.tsx` | **fixed** — `min-h-dvh` padding |
| `app/(auth)/accept-invite/page.tsx` | inherits (Input/Button/Card) |
| `app/select-plan/page.tsx` | **fixed** — wrapping billing cycle pills, 44px hits |
| `app/select-haus/page.tsx` | **fixed** — padding + heading scale |
| `app/home/page.tsx` | **fixed** — horizontal padding `px-4 md:px-6` |
| `app/(public)/get-started/page.tsx` | **fixed** — helper copy `text-xs` (was 11px) |
| `app/(public)/book/[orgSlug]/page.tsx` | **fixed** — padding + heading scale |
| `app/(public)/shop/[orgSlug]/page.tsx` | **fixed** — padding |
| `app/(public)/shop/[orgSlug]/[productId]/page.tsx` | **fixed** — padding |

### App — dashboard (custom layouts)

| File | Result |
|------|--------|
| `app/(dashboard)/dashboard/page.tsx` | **fixed** — monthly target row wraps |
| `app/(dashboard)/bookings/page.tsx` | **fixed** — date/status filters full-width; dialog `w-[calc(100%-2rem)]` |
| `app/(dashboard)/schedule/page.tsx` | **fixed** — week nav wraps; grid already `min-w-[720px]` + overflow-x |
| `app/(dashboard)/queue/page.tsx` | **fixed** — “Move forward” no longer `h-7` |
| `app/(dashboard)/pos/page.tsx` | inherits (`PosWorkspace`) |
| `app/(dashboard)/pos/tabs/page.tsx` | **fixed** — add-item row stacks; body copy `text-xs` |
| `app/(dashboard)/finance/page.tsx` | **fixed** — expenses header stacks; tab hits 44px |
| `app/(dashboard)/staff-chat/page.tsx` | **fixed** — composer stacks; channel `<select>` 44px |
| `app/(dashboard)/clients/page.tsx` | **fixed** — search `w-full` |
| `app/(dashboard)/services/page.tsx` | **fixed** — category chips 44px |
| `app/(dashboard)/retail-products/page.tsx` | **fixed** — chips + search width |
| `app/(dashboard)/settings/page.tsx` | **fixed** — theme row wraps |
| `app/(dashboard)/reviews/page.tsx` | **fixed** — staff filter width |
| `app/(dashboard)/commissions/page.tsx` | **fixed** — period select width |
| `app/(dashboard)/onboarding-checklist/page.tsx` | **fixed** — enroll select width |
| `app/(dashboard)/client-ownership/page.tsx` | **fixed** — search/tier filters |
| `app/(dashboard)/session-notes/page.tsx` | **fixed** — filter no longer `min-w-[220px]` |
| `app/(dashboard)/waitlist/page.tsx` | **fixed** — date copy `text-xs` |
| `app/(dashboard)/tips/page.tsx` | **fixed** — card header stacks |
| `app/(dashboard)/payroll/page.tsx` | **fixed** — card header stacks |
| `app/(dashboard)/time-off/page.tsx` | **fixed** — card header stacks |
| `app/(dashboard)/seat-rental/page.tsx` | **fixed** — card header stacks |
| `app/(dashboard)/qr-attendance/page.tsx` | **fixed** — date/branch controls full-width |
| `app/(dashboard)/branding/page.tsx` | **fixed** — color picker height |
| `app/(dashboard)/field-operations/page.tsx` | **fixed** — “New job” full-width on mobile |

### App — dashboard (inherit ModulePage / CrudModulePage)

These were reviewed; layout is cards/tables/forms that now get the shell, table scroll, dialog, and 44px controls.

`aftercare`, `audit-log`, `booking-deposits`, `branches`, `call-centre`, `client-consultations`, `client-patch-tests`, `client-photos`, `client-tags`, `clients/merge`, `consent-forms`, `consumption`, `coverage-zones`, `gallery`, `gift-cards`, `inventory`, `inventory/purchase-orders`, `inventory/stock-take`, `loyalty`, `marketing`, `my-earnings`, `notifications`, `packages`, `patient-intake`, `payments-demo`, `price-lock`, `progress-tracking`, `promotions`, `qr-clock`, `reconciliation`, `referrals`, `reports`, `resources`, `revenue-forecast`, `scorecards`, `shift-swap`, `shop-orders`, `staff`, `suppliers`, `support`, `wallet`, `whatsapp`.

### App — portal

| File | Result |
|------|--------|
| `app/(portal)/portal/page.tsx` | **fixed** — loyalty card wraps |
| `app/(portal)/portal/loyalty/page.tsx` | **fixed** — redeem row wraps |
| `app/(portal)/portal/wallet/page.tsx` | **fixed** — helper copy `text-xs` |
| `app/(portal)/portal/book/page.tsx` | inherits (`BookingWizard` + AppShell) |
| `app/(portal)/portal/bookings/page.tsx` | already ok (flex-wrap) |
| `app/(portal)/portal/reschedule/page.tsx` | already ok (flex-wrap) |
| `app/(portal)/portal/reviews/page.tsx` | inherits |
| `app/(portal)/portal/referrals/page.tsx` | already ok (flex-wrap) |
| `app/(portal)/portal/notifications/page.tsx` | inherits |
| `app/(portal)/portal/profile/page.tsx` | inherits |

### App — admin pages

| File | Result |
|------|--------|
| `app/(admin)/admin/page.tsx` | inherits AppShell |
| `app/(admin)/admin/tenants/page.tsx` | inherits DataTable |
| `app/(admin)/admin/subscriptions/page.tsx` | inherits |
| `app/(admin)/admin/features/page.tsx` | already ok (flex rows in tiles) |
| `app/(admin)/admin/payouts/page.tsx` | inherits |

---

### Components — marketing

| File | Result |
|------|--------|
| `marketing/MarketingNavbar.tsx` | **fixed** — 44px hamburger; drawer links `min-h-11` |
| `marketing/HeroSection.tsx` | **fixed** — eyebrow badge `max-w` so it wraps |
| `marketing/BusinessChoiceSection.tsx` | **fixed** — `minmax(0,1fr)` so brand names wrap |
| `marketing/PricingSection.tsx` | **fixed** — 44px platform/cycle chips |
| `marketing/Footer.tsx` | **fixed** — 44px links |
| `marketing/StatsSection.tsx` | already ok (2→4 col grid) |
| `marketing/FeaturesSection.tsx` | already ok |
| `marketing/DetailSection.tsx` | already ok |
| `marketing/TestimonialsSection.tsx` | already ok |

### Components — shell / CRUD / booking / POS

| File | Result |
|------|--------|
| `AppShell.tsx` | **fixed** (see above) |
| `ModulePage.tsx` | already ok (wrapper) |
| `Feature.tsx` | already ok |
| `CrudModulePage.tsx` | **fixed** |
| `CrudDialog.tsx` | inherits Dialog |
| `DataTable.tsx` | **fixed** |
| `EntityForm.tsx` | **fixed** |
| `SearchFilter.tsx` | inherits Input |
| `AnalyticsPage.tsx` | already ok (`overflow-auto` on JSON) |
| `CoverageMap.tsx` | already ok (full-width placeholder) |
| `ThemeProvider.tsx` | already ok |
| `booking/BookingWizard.tsx` | **fixed** — Back/Continue stack full-width |
| `pos/PosWorkspace.tsx` | **fixed** — qty buttons 44px; recent-sales table min-width |
| `pos/PaymentDialog.tsx` | **fixed** — title stacks; method/tip hits |
| `pos/ReceiptDialog.tsx` | **fixed** — action buttons 2×2 grid |
| `pos/HeldSalesDialog.tsx` | **fixed** — removed `h-7` buttons |
| `pos/ManagerPinDialog.tsx` | **fixed** — helper `text-xs` |
| `pos/CustomerDialog.tsx` | inherits Dialog |
| `pos/ShiftDialog.tsx` | inherits Dialog |
| `DialPad.tsx` | **fixed** — header controls 44px |
| `CustomerPicker.tsx` | **fixed** |

### Components — dashboard widgets

| File | Result |
|------|--------|
| `dashboard/StatTile.tsx` | **fixed** — wrapping KPI values, smaller type on phone |
| `dashboard/StaffLeaderboard.tsx` | **fixed** — meta row wraps |
| `dashboard/MobileDispatchDashboard.tsx` | **fixed** — list rows wrap |
| `dashboard/MobileHubDashboard.tsx` | already ok (flex-wrap actions) |
| `dashboard/SoloProDashboard.tsx` | already ok (`sm:grid-cols-3`) |
| `dashboard/ProductsDashboard.tsx` | already ok |
| `dashboard/RevenueChart.tsx` | already ok (`w-full` + ResponsiveContainer) — **visual review** |
| `dashboard/TopServicesChart.tsx` | already ok — **visual review** (Y-axis labels) |
| `dashboard/PaymentMethodsChart.tsx` | already ok — **visual review** |
| `dashboard/AiInsightsWidget.tsx` | already ok |

### Components — UI kit leftovers

| File | Result |
|------|--------|
| `ui/checkbox.tsx` | already ok (visual 16px; EntityForm expands hit area) |
| `ui/switch.tsx` | already ok (44px wide track) |
| `ui/badge.tsx` | already ok |
| `ui/label.tsx` | already ok |
| `ui/progress.tsx` | already ok |

---

## Manual / visual review (browser)

These surfaces are hard to certify from markup alone. Please click through at 360 / 390 / 414 / 768:

1. **Schedule week grid** — intended horizontal scroll at `min-w-[720px]`. Confirm the card scrolls, not the whole app.
2. **POS workspace** — catalog + cart stack (`xl` two-column). Confirm qty stepper and checkout on a phone; receipt print layout is receipt-styled (10px meta is intentional).
3. **Dashboard charts** — Recharts (`RevenueChart`, `TopServicesChart`, `PaymentMethodsChart`, finance P&amp;L). Confirm ticks/tooltips are not clipped.
4. **Staff chat** — channel `<select>` on mobile vs sidebar from `sm` up.
5. **Public booking wizard** — long service names and datetime pickers with the on-screen keyboard.
6. **QR attendance** — QR square `max-w-[200px]` is fine; confirm the scanner/print pairing on a real device.
7. **Dial pad** (call centre) — keypad is already ~56px keys; in-call labels stay compact.
8. **Admin console** — admin layout is a top nav (not AppShell drawer) except `/admin` which also mounts AppShell.

Badge / eyebrow `text-[10px]` (uppercase chips, `label-eyebrow` at 11px) was left as design-system chrome, not body copy.

---

## What was not changed

- Font families, color tokens, gradients, glass, mode themes
- Desktop sidebar width and header layout from `md` up
- Table-as-table pattern (horizontal scroll) rather than a card redesign
- Receipt typography (print-like 10px meta)
- Unrelated git dirty files (`scripts/ssh-fix-caddy.sh`, temp deploy scripts)

---

## Verification notes

Code-level review covered every `app/` and `components/` TSX file. Interactive browser verification of logged-in dashboard routes was not completed in this environment (no guaranteed running web stack + session). Highest-risk flows to smoke in a device or DevTools device mode: marketing home, login/register, AppShell drawer, POS, schedule, bookings dialog, public book/shop.
