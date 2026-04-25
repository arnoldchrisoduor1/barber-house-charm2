# Navigation matrix — business mode × role × route

**Version:** 1.0 — April 2026  
**Source of truth:** `src/components/AppLayout.tsx` (`BARBER_NAV`, `BEAUTY_NAV`, `SPA_NAV`, `NAIL_BAR_NAV`, `CLINIC_NAV`, `MOBILE_NAV`, `THERAPY_NAV`, `PRODUCTS_NAV`).  

Legend: **Feat** = subscription feature key (`pos_payments`, `inventory_tracking`, `promotions_referrals`, `staff_commissions_payroll`, `multi_branch`, `custom_branding`, `sms_reminders`, `advanced_analytics`). Items without Feat are gated by **role only** (and active subscription/trial for org existence).

---

## Barber (`barber`)

| Section | Roles | Label → path | Feat |
|---------|-------|--------------|------|
| Executive | ceo, director | Executive Dashboard → `/dashboard` | — |
| Executive | ceo, director | Branch Overview → `/branches` | multi_branch (nav shows; route PG in App) |
| Executive | ceo, director | Reports & Analytics → `/reports` | — |
| Executive | ceo, director | Finance → `/finance` | — |
| Executive | ceo, director | Commissions → `/commissions` | staff_commissions_payroll |
| Executive | ceo, director | Payroll & Payslips → `/payroll` | staff_commissions_payroll |
| Executive | ceo, director | Audit Log → `/audit-log` | advanced_analytics |
| Executive | ceo, director | QR Attendance → `/qr-attendance` | — |
| Executive | ceo, director | Barber Scorecards → `/scorecards` | advanced_analytics |
| Executive | ceo, director | Haus Connect → `/call-centre` | advanced_analytics |
| Branch | branch_manager | Branch Dashboard → `/dashboard` | — |
| Branch | branch_manager | Today's Schedule → `/schedule` | — |
| Branch | branch_manager | Barber Attendance → `/staff` | — |
| Branch | branch_manager | Bookings → `/bookings` | — |
| Branch | branch_manager | Waitlist → `/waitlist` | — |
| Branch | branch_manager | Walk-in Queue → `/queue` | — |
| Branch | branch_manager | QR Attendance → `/qr-attendance` | — |
| Reception | receptionist | Live Bookings → `/bookings` | — |
| Reception | receptionist | Client Check-in → `/clients` | — |
| Reception | receptionist | Queue Manager → `/queue` | — |
| Reception | receptionist | Schedule → `/schedule` | — |
| Reception | receptionist | QR Clock Mode → `/qr-clock` | — |
| Reception | receptionist | POS → `/pos` | pos_payments |
| My Chair | senior_barber, junior_barber | My Dashboard → `/dashboard` | — |
| My Chair | senior/junior | My Bookings → `/bookings` | — |
| My Chair | senior/junior | My Schedule → `/schedule` | — |
| My Chair | senior/junior | QR Clock In → `/qr-clock` | — |
| My Chair | senior/junior | My Reviews → `/reviews` | — |
| My Chair | senior/junior | My Earnings → `/my-earnings` | — |
| My Chair | senior/junior | My Clients → `/clients` | — |
| My Chair | senior/junior | POS → `/pos` | pos_payments |
| Services | ceo, director | Barbershop Services → `/services` | — |
| Services | ceo, director | Barber Directory → `/staff` | — |
| Services | ceo, director | Clients → `/clients` | — |
| Services | ceo, director | Client Ownership → `/client-ownership` | — |
| Sales | ceo, director | POS, Price Lock, Reconciliation | pos_payments |
| Sales | ceo, director | Inventory, Consumption, Suppliers | inventory_tracking |
| Growth | ceo, director, branch_manager | Loyalty, Packages, Gift Cards, Reviews | — |
| Growth | ceo, director, branch_manager | Promotions, Referrals | promotions_referrals |
| Growth | ceo, director, branch_manager | WhatsApp | sms_reminders |
| Growth | ceo, director, branch_manager, senior_barber | Portfolio → `/gallery` | — |
| Growth | ceo, director | Marketing → `/marketing` | — |
| Operations | ceo, director, branch_manager, receptionist | Tips → `/tips` | — |
| Operations | ceo, director, branch_manager | Retail Products, Revenue Forecast | — |
| Operations | all staff roles in code | Staff Chat → `/staff-chat` | — |
| System | ceo, director | Branding | custom_branding |
| System | ceo, director | Chair Rental | multi_branch |
| System | all above | Notifications, Settings, Support | — |

---

## Beauty (`beauty`)

Same **paths** and **feature keys** as barber; labels/sections differ.

| Section | Roles | Label → path | Feat |
|---------|-------|--------------|------|
| Executive | ceo, director | Salon Dashboard → `/dashboard` | — |
| Executive | ceo, director | Branch Overview → `/branches` | multi_branch |
| Executive | ceo, director | Reports & Analytics → `/reports` | — |
| Executive | ceo, director | Finance → `/finance` | — |
| Executive | ceo, director | Commissions → `/commissions` | staff_commissions_payroll |
| Executive | ceo, director | Payroll & Payslips → `/payroll` | staff_commissions_payroll |
| Executive | ceo, director | Audit Log → `/audit-log` | advanced_analytics |
| Executive | ceo, director | QR Attendance → `/qr-attendance` | — |
| Executive | ceo, director | Stylist Scorecards → `/scorecards` | advanced_analytics |
| Executive | ceo, director | Haus Connect → `/call-centre` | advanced_analytics |
| Salon Floor | branch_manager | Salon Dashboard → `/dashboard` | — |
| Salon Floor | branch_manager | Today's Schedule → `/schedule` | — |
| Salon Floor | branch_manager | Stylist Attendance → `/staff` | — |
| Salon Floor | branch_manager | Appointments → `/bookings` | — |
| Salon Floor | branch_manager | Waitlist → `/waitlist` | — |
| Salon Floor | branch_manager | QR Attendance → `/qr-attendance` | — |
| Reception | receptionist | Appointments → `/bookings` | — |
| Reception | receptionist | Client Check-in → `/clients` | — |
| Reception | receptionist | Schedule → `/schedule` | — |
| Reception | receptionist | QR Clock Mode → `/qr-clock` | — |
| Reception | receptionist | POS → `/pos` | pos_payments |
| My Station | senior_barber, junior_barber | My Dashboard → `/dashboard` | — |
| My Station | senior/junior | My Appointments → `/bookings` | — |
| My Station | senior/junior | My Schedule → `/schedule` | — |
| My Station | senior/junior | My Reviews → `/reviews` | — |
| My Station | senior/junior | My Earnings → `/my-earnings` | — |
| My Station | senior/junior | My Clients → `/clients` | — |
| Services | ceo, director | Beauty Services → `/services` | — |
| Services | ceo, director | Stylist Directory → `/staff` | — |
| Services | ceo, director | Clients → `/clients` | — |
| Services | ceo, director | Client Ownership → `/client-ownership` | — |
| Sales | ceo, director | POS, Price Lock, Reconciliation | pos_payments |
| Sales | ceo, director | Inventory, Consumption, Suppliers | inventory_tracking |
| Growth | ceo, director, branch_manager | Loyalty, Packages, Gift Cards, Reviews, Promotions, Referrals, WhatsApp, Marketing | promotions_referrals / sms_reminders as in barber |
| Growth | + senior_barber | Before & After Gallery → `/gallery` | — |
| Operations | mixed | Tips, Retail Products, Consent Forms, Revenue Forecast, Staff Chat | — |
| System | ceo, director | Branding, Station Rental, Notifications, Settings, Support | custom_branding / multi_branch |

---

## Spa (`spa`)

| Section | Roles | Highlights vs barber |
|---------|-------|------------------------|
| Executive | ceo, director | Wellness Dashboard; Therapist Scorecards; no commissions/payroll rows in SPA_NAV |
| Spa Floor | branch_manager | Spa Dashboard, Session Schedule, Sessions, QR Attendance — **no waitlist/queue** |
| Front Desk | receptionist | Sessions, Guest Check-in, Schedule, POS (feat) |
| My Room | senior/junior | My Sessions, no separate “My Clients” in spa nav snippet |
| Treatments | ceo, director | Treatments & Services, Therapist Directory, Guests |
| Sales | ceo, director | POS, Inventory, Suppliers (feat) — no price lock/reconciliation in spa excerpt |
| Guest Experience | growth roles | Loyalty, Packages, Gift Cards, Reviews, Ambience Gallery, Consent & Allergies |
| Operations | | Tips, Retail, Revenue Forecast, Team Chat |
| System | | Branding (feat), Room Rental (feat), Notifications, Settings, Support |

---

## Nail bar (`nail_bar`)

Executive: Nail Bar Dashboard, Nail Tech Scorecards; **no** commissions/payroll lines in excerpt.  
Floor: Station Dashboard, Schedule, Appointments, **Walk-in Queue**, QR.  
Reception: Appointments, Client Check-in, **Queue**, POS (feat).  
My Station: Dashboard, Appointments, Reviews, Earnings — **no schedule/QR clock** in nail excerpt.  
Growth: Nail Art Gallery.  
Operations: Team Chat; **no** Revenue Forecast on nail excerpt.  
System: Notifications, Settings, Support only (no branding in snippet).

---

## Clinic (`clinic`)

Executive: Clinic Dashboard, Practitioner Scorecards.  
Clinic Floor: Consultations, Consultation Schedule, QR.  
Reception: Consultations, **Patient** Check-in, Schedule, **Billing** POS (feat).  
My Practice: My Consultations, Schedule, Reviews, Earnings.  
Clinical: Procedures & Treatments, Practitioner Directory, Patients, **Patient Intake**, Consent & Liability, **Aftercare**.  
Sales: Billing POS, Inventory, Suppliers (feats).  
Growth: Treatment Packages, Patient Reviews, Before & After, Referrals (feat), Marketing.  
Operations: Revenue Forecast, Team Chat.

---

## Mobile (`mobile`)

Executive: Mobile Dashboard, Service Areas, **no** QR attendance in exec snippet; Pro Scorecards.  
Dispatch: Dispatch Dashboard, Today's Schedule, Home Visits, **Coverage Zones**.  
On the Road: My Visits, Schedule, Reviews, Earnings — **no** QR clock in snippet.  
Services: Mobile Services, Mobile Pros, Clients, **Coverage Zones**, Liability Waivers.  
Growth: Loyalty, Reviews, Referrals (feat), Portfolio, Marketing.  
Operations: Tips, Revenue Forecast, Team Chat.

Implementation note: mobile flow includes specialty overlay behavior (`mobileSpecialty` + `effectiveCategories`) and field modules (`/field-operations`, `/coverage-zones`) used for dispatch-style operations.

---

## Therapy (`therapy`)

Executive: Practice Dashboard, Therapist Scorecards; **no** audit/QR in snippet.  
Practice: Sessions, Session Schedule, QR Attendance.  
My Sessions: My Sessions, Schedule, Reviews, Earnings.  
Clinical: Therapy Sessions, Therapist Directory, Clients, **Session Notes**, **Client Progress**, Intake & Consent.  
Growth: Client Retention (loyalty), Session Packages, Reviews, Referrals (feat).  
Operations: **Session Billing** POS (feat), Revenue Forecast, Team Chat.  
System: **Room Rental** (feat), Notifications, Settings, Support.

---

## Solo Pro (`solo_pro`)

Current status in codebase:

- `solo_pro` exists in business category, theming, and pricing selectors.
- No dedicated `SOLO_PRO_NAV` array exists in `AppLayout` yet.
- Sidebar currently falls back to default mode navigation when `solo_pro` is the only selected category.
- Platform selection exposes specialty-specific solo entries (solo barber/beauty/spa/nails/clinic/therapy) to keep one-person operations aligned to service domain.

---

## Products (`products`)

`PRODUCTS_NAV` is implemented and includes these role-oriented sections:

- **Executive (ceo/director):** Store Dashboard, locations, analytics, finance, payroll/commissions (feature-gated), audit, revenue forecast.
- **Store Floor (branch_manager):** Store dashboard, POS/till, stock, online orders, staff/QR attendance.
- **Till (receptionist):** cashier dashboard, POS/till, customer lookup, online orders, stock lookup, QR clock.
- **Sales Floor (senior/junior):** ring up sale, product catalogue, stock lookup, my customers, QR clock, my earnings.
- **Catalogue/Sales/Growth/System:** inventory/consumption/suppliers/price-lock, reconciliation, bundles/kits, product gallery, team chat, branding, support.

---

## Customer portal (all modes)

| Path | Purpose |
|------|---------|
| `/portal` | Customer home |
| `/portal/bookings` | Own bookings |
| `/portal/loyalty` | Loyalty |
| `/portal/reviews` | Reviews |
| `/portal/referrals` | Referrals |
| `/portal/profile` | Profile |

**Subscription:** portal features follow org plan (e.g. referrals hidden if org lacks `promotions_referrals`) — enforce server-side.

---

## App.tsx route-level feature gates (Next.js middleware mirror)

These staff routes use **extra** subscription gate in addition to role (see `PG` wrapper in `App.tsx`):

- `/pos`, `/reconciliation` → `pos_payments`  
- `/inventory`, `/consumption`, `/price-lock`, `/suppliers` → `inventory_tracking`  
- `/promotions`, `/referrals` → `promotions_referrals`  
- `/branches` → `multi_branch`  
- `/commissions` → `staff_commissions_payroll`  
- `/payroll` → `payroll`  
- `/scorecards`, `/call-centre`, `/audit-log` → `advanced_analytics`  
- `/branding` → `custom_branding`  
- `/whatsapp` → `sms_reminders`  

---

© 2026 Haus of Grooming OS. All rights reserved.
