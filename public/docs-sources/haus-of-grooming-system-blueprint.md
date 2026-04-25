# Haus of Grooming OS — Full System Blueprint

**Version:** 1.0 | **Date:** April 2026 | **Type:** Developer-Ready Architecture Document

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Design](#4-database-design)
5. [API Structure](#5-api-structure)
6. [System Logic & Flows](#6-system-logic--flows)
7. [Mode-Specific Logic](#7-mode-specific-logic)
8. [Permissions & Access Control](#8-permissions--access-control)
9. [Business Rules](#9-business-rules)
10. [Reporting Data Structure](#10-reporting-data-structure)
11. [Integrations](#11-integrations)
12. [Subscription & Billing](#12-subscription--billing)

### Implementation bridge (read this first)

Sections **2–3, 5, and 11** still describe **screen behavior and data** in vocabulary inherited from the prototype (e.g. React Router provider tree, Supabase SDK call shapes, Edge Function names). **Production behavior** is implemented as:

- **Next.js (App Router)** + TanStack Query + Laravel REST — see [full-stack-implementation-master-plan.md](./full-stack-implementation-master-plan.md).  
- **Realtime:** Soketi / Pusher protocol (Laravel broadcasting), not Supabase Realtime.  
- **Auth:** Laravel + Sanctum (and first-party password / OAuth flows), not Supabase Auth SDK.  
- **Integrations:** Laravel controllers + **Horizon jobs** (and signed webhooks), not Supabase Edge Functions or Lovable gateways.

Use this blueprint for **product routes, modules, tables, and flows**; use the master plan for **how we build and run** the platform.

---

## 1. System Overview

### Platform Identity
**Haus of Grooming OS** is a multi-tenant SaaS platform for beauty, wellness, and grooming businesses. Each tenant (organization) selects one or more business modes that control UI labels, sidebar structure, service categories, and terminology.

### 7 Business Modes

| Mode | Brand Label | Staff Term | Client Term | Booking Term | Station Term |
|------|------------|------------|-------------|-------------|-------------|
| Barber | Haus of Barber | Barber | Client | Appointment | Chair |
| Beauty | Haus of Beauty | Stylist | Client | Appointment | Station |
| Spa | Haus of Wellness | Therapist | Guest | Session | Treatment Room |
| Nail Bar | Haus of Nails | Nail Tech | Client | Appointment | Station |
| Clinic | Haus of Aesthetics | Practitioner | Patient | Consultation | Treatment Room |
| Mobile | Haus of Mobile | Mobile Pro | Client | Home Visit | Service Area |
| Therapy | Haus of Therapy | Therapist | Client | Session | Session Room |
| Multi (2+) | Haus of Grooming | Professional | Client | Appointment | Station |

### Tech Stack (production target)

The **production** platform is implemented on the stack below. The `barber-house-charm` repository historically contained a **prototype UI + data model** (Vite/React + Supabase-style access); that stack is **not** the long-term production architecture. See [full-stack-implementation-master-plan.md](./full-stack-implementation-master-plan.md) for the end-to-end build plan, DevOps, scaling, and security.

- **Frontend:** Next.js 14+ (App Router), TypeScript 5, Tailwind CSS v3, shadcn/ui (Radix)
- **Server state:** TanStack React Query v5; OpenAPI-aligned API client to Laravel
- **Backend:** Laravel 11 (PHP 8.3) modular monolith — REST API, Sanctum, Spatie Permission, Horizon
- **Database:** PostgreSQL 16 (tenancy via `organization_id` + global scopes); PgBouncer at scale
- **Cache / queue / sessions:** Redis 7
- **Async jobs:** Laravel Horizon (SMS, WhatsApp, email, M-Pesa reconciliation, reports)
- **Realtime:** Soketi (Pusher-compatible) or managed equivalent — staff chat, live queue, booking events
- **Object storage:** S3-compatible (e.g. AWS S3, Cloudflare R2) — media, receipts, exports
- **Calling (extracted):** Node.js 20 service — WebRTC signaling; Laravel persists call history via signed webhooks
- **Payments:** M-Pesa Daraja STK Push (Laravel callbacks, idempotent handlers)
- **Messaging:** Africa's Talking / Twilio / Meta WhatsApp — via queued jobs, not inline HTTP
- **Edge / bot protection:** Cloudflare (or equivalent) — WAF, Turnstile, rate limiting; Laravel rate limiters per route
- **AI (optional):** First-party OpenAI / Gemini with tenant-scoped keys and budgets (no third-party AI gateway dependency)

### Multi-Tenancy Model
- Every data table includes `organization_id` column
- Row-Level Security (RLS) enforces `organization_id = get_user_organization_id(auth.uid())`
- On signup: user → profile → user_roles(customer) → organization → organization_members → subscription(trial)

---

## 2. Frontend Architecture

### 2A. App Structure & Routing

#### Provider hierarchy (Next.js production target)

```
app/layout.tsx (root)
  └─ QueryClientProvider
       └─ TooltipProvider
            └─ NextIntlClientProvider (or equivalent)
                 └─ ErrorBoundary
                      └─ Session / org context (from server or client)
                           └─ BusinessCategoryProvider
                                └─ Feature sync from GET /me
                                     └─ {children} + parallel routes / modals
```

Routing uses the **App Router** (`app/(marketing)`, `app/(auth)`, `app/(dashboard)`, `app/(portal)`) instead of `react-router-dom` `BrowserRouter`.

#### Layout Types
1. **No layout** — Landing page (`/`), public booking (`/book`), discover (`/discover`)
2. **PublicRoute wrapper** — Auth pages (redirect logged-in users)
3. **AppLayout (P)** — Staff/Admin dashboard with mode-specific sidebar
4. **AppLayout + FeatureGate (PG)** — Gated by subscription plan
5. **CustomerLayout (CP)** — Customer portal with simplified nav

#### Complete Route Map

| Route | Layout | Page Component | Feature Gate | Purpose |
|-------|--------|---------------|-------------|---------|
| `/` | None | Index | — | Landing page |
| `/book` | None | PublicBookingPage | — | Public booking widget |
| `/discover` | None | DiscoverPage | — | Public marketplace |
| `/barbers/:id` | None | BarberProfilePage | — | Public staff profile |
| `/get-started` | Public | PortalSelectPage | — | Choose customer vs business |
| `/auth` | Public | AuthPage | — | Login / Signup |
| `/reset-password` | None | ResetPasswordPage | — | Password reset |
| `/home` | — | SmartRedirect | — | Role-based redirect |
| `/portal` | Customer | CustomerHomePage | — | Customer dashboard |
| `/portal/bookings` | Customer | CustomerBookingsPage | — | My bookings |
| `/portal/loyalty` | Customer | CustomerLoyaltyPage | — | Loyalty points |
| `/portal/reviews` | Customer | CustomerReviewsPage | — | My reviews |
| `/portal/referrals` | Customer | CustomerReferralsPage | — | Referral program |
| `/portal/profile` | Customer | CustomerProfilePage | — | Edit profile |
| `/dashboard` | Staff | DashboardPage | — | Executive/branch/personal dashboard |
| `/bookings` | Staff | BookingPage | — | Booking management |
| `/services` | Staff | ServicesPage | — | Service CRUD |
| `/clients` | Staff | ClientsPage | — | Client CRM |
| `/staff` | Staff | StaffPage | — | Staff directory |
| `/schedule` | Staff | SchedulePage | — | Calendar/schedule view |
| `/waitlist` | Staff | WaitlistPage | — | Waitlist management |
| `/queue` | Staff | QueuePage | — | Walk-in queue |
| `/pos` | Staff | POSPage | pos_payments | Point of sale |
| `/inventory` | Staff | InventoryPage | inventory_tracking | Consumable inventory |
| `/consumption` | Staff | ConsumptionTrackerPage | inventory_tracking | Product usage tracking |
| `/price-lock` | Staff | PriceLockPage | inventory_tracking | Price lock management |
| `/reconciliation` | Staff | ReconciliationPage | pos_payments | Payment reconciliation |
| `/loyalty` | Staff | LoyaltyPage | — | Loyalty program |
| `/promotions` | Staff | PromotionsPage | promotions_referrals | Promo codes |
| `/referrals` | Staff | ReferralsPage | promotions_referrals | Referral tracking |
| `/reviews` | Staff | ReviewsPage | — | Review management |
| `/reports` | Staff | ReportsPage | — | Analytics reports |
| `/finance` | Staff | FinancePage | — | Revenue & expenses |
| `/branches` | Staff | BranchesPage | multi_branch | Multi-branch |
| `/commissions` | Staff | CommissionsPage | staff_commissions_payroll | Commission reports |
| `/my-earnings` | Staff | MyEarningsPage | — | Personal earnings |
| `/my-attendance` | Staff | MyAttendancePage | — | Personal attendance |
| `/qr-clock` | Staff | QRClockModePage | — | QR clock in/out |
| `/scorecards` | Staff | ScorecardsPage | advanced_analytics | Staff performance |
| `/packages` | Staff | PackagesPage | — | Service bundles |
| `/gift-cards` | Staff | GiftCardsPage | — | Gift card management |
| `/payroll` | Staff | PayrollPage | payroll | Payroll & payslips |
| `/call-centre` | Staff | CallCentrePage | advanced_analytics | Haus Connect (calls) |
| `/seat-rental` | Staff | SeatRentalPage | — | Chair/station rental |
| `/suppliers` | Staff | SupplierLedgerPage | inventory_tracking | Supplier management |
| `/partnership` | Staff | PartnershipPage | — | Partnerships |
| `/compliance` | Staff | CompliancePage | — | Compliance docs |
| `/client-ownership` | Staff | ClientOwnershipPage | — | Client assignments |
| `/branding` | Staff | BrandingPage | custom_branding | Brand settings |
| `/whatsapp` | Staff | WhatsAppPage | sms_reminders | WhatsApp integration |
| `/audit-log` | Staff | AuditLogPage | advanced_analytics | Activity audit trail |
| `/qr-attendance` | Staff | QRAttendancePage | — | QR attendance records |
| `/gallery` | Staff | GalleryPage | — | Photo portfolio |
| `/tips` | Staff | TipsPage | — | Tip tracking |
| `/consent-forms` | Staff | ConsentFormsPage | — | Consent/allergy forms |
| `/staff-chat` | Staff | StaffChatPage | — | Real-time team chat |
| `/retail-products` | Staff | RetailProductsPage | — | Retail product sales |
| `/revenue-forecast` | Staff | RevenueForecastPage | — | AI revenue forecast |
| `/marketing` | Staff | MarketingPage | — | Marketing campaigns |
| `/coverage-zones` | Staff | CoverageZonesPage | — | Mobile mode zones |
| `/patient-intake` | Staff | PatientIntakePage | — | Clinic patient intake |
| `/aftercare` | Staff | AftercarePage | — | Post-treatment care |
| `/session-notes` | Staff | SessionNotesPage | — | Therapy session notes |
| `/progress-tracking` | Staff | ProgressTrackingPage | — | Client progress |
| `/notifications` | Staff | NotificationsPage | — | Notifications inbox |
| `/onboarding` | Auth | OnboardingPage | — | Business setup wizard |
| `/settings` | Staff | SettingsPage | — | App settings |
| `/support` | Staff | SupportPage | — | Help & support |
| `/contact` | Staff | ContactPage | — | Contact form |
| `/select-plan` | Auth | SelectPlanPage | — | Plan selection |

### 2B. Screens Per Module (Detailed)

---

#### EXECUTIVE MODULE

**Screen: Executive Dashboard** (`/dashboard`)
- **Purpose:** High-level business KPIs for CEO/Director
- **Sections/Components:**
  - KPI stat cards: Today's bookings, total customers, monthly revenue, average rating
  - Revenue chart (line/area — last 30 days)
  - Top services chart (bar)
  - Payment methods breakdown (pie)
  - Staff leaderboard (table)
  - Recent bookings list
  - Monthly booking trend
- **Data:** bookings, transactions, customers, services, staff, reviews
- **Actions:** Navigate to any sub-module, filter by branch, filter by date range
- **APIs:** `bookings.select()`, `customers.select(count)`, `reviews.select(avg)`, `services.select()`
- **Demo fallback:** Full demo KPIs, charts, and leaderboard per business mode

**Screen: Branch Overview / Locations** (`/branches`)
- **Purpose:** Manage multiple branch locations
- **Sections:** Branch list (cards), Add Branch dialog, Edit branch form
- **Data per branch:** name, address, city, phone, email, opening/closing time, logo, cover image, WhatsApp number, slug, is_active
- **Actions:** Create, edit, toggle active, view on map
- **APIs:** `branches.select()`, `branches.insert()`, `branches.update()`
- **Feature gate:** `multi_branch` (Enterprise)

**Screen: Reports & Analytics** (`/reports`)
- **Purpose:** Detailed analytics dashboards
- **Sections:** Revenue reports, service popularity, staff utilization, client retention, booking trends
- **Data:** Aggregated from bookings, transactions, customers, services, staff_schedules
- **Actions:** Export CSV, filter by date, filter by branch
- **APIs:** Aggregation queries across multiple tables

**Screen: Finance** (`/finance`)
- **Purpose:** Revenue vs expenses, profit tracking
- **Sections:** Revenue summary, expense list, expense categories breakdown, add expense form
- **Data:** transactions (revenue), expenses, tips
- **Actions:** Add expense, categorize, view receipt, export
- **APIs:** `expenses.select()`, `expenses.insert()`, `tips.select()`

**Screen: Commissions** (`/commissions`)
- **Purpose:** Staff commission reports
- **Sections:** Commission per staff member, rate configuration, period selector
- **Data:** staff (commission_rate), bookings (revenue), tips
- **Actions:** Adjust rates, view breakdown by staff
- **Feature gate:** `staff_commissions_payroll`

**Screen: Payroll & Payslips** (`/payroll`)
- **Purpose:** Generate payslips
- **Sections:** Staff list with earnings, deductions, net pay calculation, payslip PDF generation
- **Feature gate:** `staff_commissions_payroll`

**Screen: Audit Log** (`/audit-log`)
- **Purpose:** Activity trail for compliance
- **Sections:** Filterable table with action, entity, user, timestamp, IP
- **Data:** audit_log table
- **Actions:** Filter by action type, entity type, date range, user
- **APIs:** `audit_log.select()` (management only)

**Screen: QR Attendance** (`/qr-attendance`)
- **Purpose:** Staff clock-in/out records via QR scan
- **Sections:** Scan records table, date filter, verification status
- **Data:** qr_scans (staff_id, scan_type: check_in/check_out, scanned_at, geo_lat/lng, verified)
- **Actions:** Verify scan, filter by date/staff
- **APIs:** `qr_scans.select()`, `qr_scans.update()`

**Screen: Scorecards** (`/scorecards`)
- **Purpose:** Staff performance metrics
- **Sections:** Scorecard per staff (bookings count, revenue, avg rating, client retention rate, attendance)
- **Data:** Aggregated from bookings, reviews, qr_scans, customers
- **Actions:** Filter by period, compare staff
- **Feature gate:** `advanced_analytics`

**Screen: Haus Connect / Call Centre** (`/call-centre`)
- **Purpose:** Centralized booking via phone
- **Sections:** Dial pad component, recent calls log, quick-book form, customer search
- **Data:** customers (phone lookup), bookings
- **Actions:** Dial number, search customer by phone, create booking from call
- **Feature gate:** `advanced_analytics`

---

#### BOOKING & SCHEDULING MODULE

**Screen: Bookings** (`/bookings`)
- **Purpose:** View and manage all appointments
- **Sections:** Calendar/list toggle, booking cards, create booking dialog, status filters
- **Data per booking:** customer, staff, service(s), date, start_time, end_time, status, branch, is_walkin, notes
- **Statuses:** scheduled, confirmed, in_progress, completed, cancelled, no_show
- **Actions:** Create, edit, cancel, mark complete, mark no-show, reschedule, assign staff
- **APIs:** `bookings.select()`, `bookings.insert()`, `bookings.update()`, `booking_services.select()`
- **Multi-service:** booking_services junction table supports multiple services per booking with individual staff, price, duration

**Screen: Schedule** (`/schedule`)
- **Purpose:** Calendar view of staff schedules
- **Sections:** Weekly/daily calendar, staff filter, drag-to-reschedule
- **Data:** staff_schedules (staff_id, schedule_date, start_time, end_time, is_day_off, notes), bookings overlay
- **Actions:** Set schedule, mark day off, view conflicts
- **APIs:** `staff_schedules.select()`, `staff_schedules.insert()`, `staff_schedules.update()`

**Screen: Waitlist** (`/waitlist`)
- **Purpose:** Manage walk-in or overflow clients
- **Sections:** Waitlist queue, estimated wait time, promote to booking
- **Actions:** Add to waitlist, promote, remove, re-order

**Screen: Walk-in Queue** (`/queue`)
- **Purpose:** Real-time queue for walk-in clients (Barber/Nail Bar)
- **Sections:** Live queue board, next-up indicator, average wait time
- **Actions:** Add to queue, serve next, skip, remove
- **Real-time:** Laravel Echo + Soketi (or Pusher) — `WalkInQueueUpdated` broadcast to org channel

---

#### SERVICES & STAFF MODULE

**Screen: Services** (`/services`)
- **Purpose:** CRUD for service menu
- **Sections:** Service list (table/cards), add service dialog, category filter
- **Data per service:** name, category, price_kes, duration_minutes, description, image_url, is_active, branch_id
- **Categories:** Mode-specific (e.g., Barber: haircut, beard, shave, combo, specialty, styling)
- **Actions:** Create, edit, toggle active, delete (management only), upload image
- **APIs:** `services.select()`, `services.insert()`, `services.update()`, `services.delete()`

**Screen: Staff Directory** (`/staff`)
- **Purpose:** Manage team members
- **Sections:** Staff list (cards), add staff dialog, staff detail
- **Data per staff:** full_name, email, phone, role, specialties[], commission_rate, bio, avatar_url, branch_id, slug, is_active
- **Actions:** Create, edit, toggle active, delete, upload avatar, view performance
- **APIs:** `staff.select()`, `staff.insert()`, `staff.update()`, `staff.delete()`

**Screen: Clients / CRM** (`/clients`)
- **Purpose:** Customer relationship management
- **Sections:** Client list (table), client detail drawer, add client dialog, search/filter
- **Data per client:** full_name, phone, email, style_preferences, notes, loyalty_tier (bronze/silver/gold/platinum), loyalty_points, total_visits, total_spent, last_visit_at, referral_code
- **Actions:** Create, edit, view history, view bookings, add notes
- **APIs:** `customers.select()`, `customers.insert()`, `customers.update()`

**Screen: Client Ownership** (`/client-ownership`)
- **Purpose:** Assign clients to specific staff members
- **Sections:** Ownership mapping table, reassign dialog
- **Actions:** Assign, reassign, view assigned clients per staff

---

#### SALES MODULE

**Screen: POS** (`/pos`)
- **Purpose:** Point of sale for checkout
- **Sections:** Service selector, cart, payment method selector, receipt
- **Payment methods:** Cash, M-Pesa, Card, Gift Card
- **Actions:** Add items, apply discount, process payment, generate receipt, apply promo code
- **Feature gate:** `pos_payments`

**Screen: Inventory** (`/inventory`)
- **Purpose:** Track consumable products
- **Sections:** Inventory table, add item dialog, reorder alerts
- **Data per item:** name, category, quantity, unit, unit_cost_kes, reorder_level, supplier, branch_id, last_restocked_at
- **Actions:** Add item, edit, restock, view low-stock alerts
- **Feature gate:** `inventory_tracking`

**Screen: Consumption Tracker** (`/consumption`)
- **Purpose:** Track product usage per service/booking
- **Feature gate:** `inventory_tracking`

**Screen: Price Lock** (`/price-lock`)
- **Purpose:** Lock prices for specific clients or packages
- **Feature gate:** `pos_payments`

**Screen: Reconciliation** (`/reconciliation`)
- **Purpose:** Match payments to bookings, end-of-day balancing
- **Feature gate:** `pos_payments`

**Screen: Suppliers** (`/suppliers`)
- **Purpose:** Supplier contact and ledger management
- **Sections:** Supplier list, purchase orders, payment history
- **Feature gate:** `inventory_tracking`

---

#### GROWTH MODULE

**Screen: Loyalty** (`/loyalty`)
- **Purpose:** Loyalty program management
- **Sections:** Reward list, tier thresholds, customer points overview
- **Data per reward:** name, description, points_required, reward_type (discount/free_service/product), reward_value, is_active
- **Tier system:** Bronze (0) → Silver (500) → Gold (1500) → Platinum (5000)
- **Actions:** Create reward, edit, toggle active
- **APIs:** `loyalty_rewards.select()`, `loyalty_rewards.insert()`, `loyalty_rewards.update()`

**Screen: Packages** (`/packages`)
- **Purpose:** Service bundles (e.g., "5 Haircuts for KES 3,500")
- **Sections:** Package list, create dialog, customer package tracker
- **Data per package:** name, description, package_type (bundle/membership), total_sessions, price_kes, valid_days, service_category
- **Data per customer_package:** customer_id, package_id, sessions_used, amount_paid, expires_at, status
- **Actions:** Create package, sell to customer, track usage
- **APIs:** `service_packages.*`, `customer_packages.*`

**Screen: Gift Cards** (`/gift-cards`)
- **Purpose:** Issue and manage gift cards
- **Sections:** Gift card list, issue dialog, redemption history
- **Data per card:** code (unique), initial_balance, current_balance, recipient_name, recipient_phone, message, is_active, issued_by
- **Data per redemption:** amount_redeemed, remaining_balance, redeemed_by, transaction_id
- **Actions:** Issue card, redeem, deactivate, view history
- **APIs:** `gift_cards.*`, `gift_card_redemptions.*`

**Screen: Promotions** (`/promotions`)
- **Purpose:** Promo codes and discount campaigns
- **Data per promo:** name, description, discount_type (percentage/fixed), discount_value, promo_code, starts_at, ends_at, max_uses, current_uses, min_spend_kes, is_first_time_only, is_active
- **Actions:** Create, edit, toggle active, delete
- **Feature gate:** `promotions_referrals`

**Screen: Referrals** (`/referrals`)
- **Purpose:** Track customer referrals
- **Data per referral:** referrer_customer_id, referred_customer_id, referral_code, reward_kes, status (pending/completed/expired), completed_at
- **Actions:** View referrals, mark completed, adjust reward
- **Feature gate:** `promotions_referrals`

**Screen: Reviews** (`/reviews`)
- **Purpose:** Customer review management
- **Sections:** Review list, average rating, rating distribution, filter by staff
- **Data per review:** customer_id, staff_id, booking_id, rating (1-5), comment, created_at
- **Actions:** View, respond, delete (management only)

**Screen: Gallery / Portfolio** (`/gallery`)
- **Purpose:** Before/after photos, portfolio showcase
- **Actions:** Upload, tag staff/service, delete

**Screen: WhatsApp** (`/whatsapp`)
- **Purpose:** WhatsApp message templates and bot management
- **Feature gate:** `sms_reminders`

**Screen: Marketing** (`/marketing`)
- **Purpose:** Campaign management, email/SMS blasts
- **Actions:** Create campaign, select audience, schedule, track engagement

---

#### OPERATIONS MODULE

**Screen: Tips** (`/tips`)
- **Purpose:** Track staff tips
- **Sections:** Tips table, add tip dialog, tips by staff chart
- **Data per tip:** staff_id, customer_id, booking_id, amount_kes, payment_method, tip_date, notes
- **Actions:** Record tip, view totals by staff/period

**Screen: Retail Products** (`/retail-products`)
- **Purpose:** Manage products for retail sale
- **Data per product:** name, description, category, sku, price_kes, cost_kes, quantity, reorder_level, image_url, is_active
- **Actions:** CRUD, track stock

**Screen: Consent / Allergy Forms** (`/consent-forms`)
- **Purpose:** Client consent and allergy documentation
- **Data per form:** title, form_type, content, customer_id, is_signed, signed_at, signature_url, expires_at
- **Actions:** Create form, send to client, mark signed, view history

**Screen: Staff Chat** (`/staff-chat`)
- **Purpose:** Real-time team communication
- **Data per message:** sender_id, message, channel, is_pinned, parent_id (threads)
- **Real-time:** Echo private channel `org.{id}.chat` + events persisted to `staff_chat_messages`
- **Actions:** Send message, reply in thread, pin message

**Screen: Revenue Forecast** (`/revenue-forecast`)
- **Purpose:** AI-powered revenue predictions
- **Data input:** Historical bookings, seasonality, trends
- **Output:** Projected revenue, confidence interval

---

#### MODE-SPECIFIC SCREENS

**Screen: Coverage Zones** (`/coverage-zones`) — Mobile Mode
- **Data:** name, city, center_lat/lng, radius_km, area_polygon, surcharge_kes, is_active
- **Actions:** Define zone, set surcharge, toggle active

**Screen: Patient Intake** (`/patient-intake`) — Clinic Mode
- **Data:** customer_id, medical_history, allergies, medications, emergency contacts, consent_given
- **Actions:** Create intake form, update, view history

**Screen: Aftercare** (`/aftercare`) — Clinic Mode
- **Data:** booking_id, customer_id, service_id, title, instructions, follow_up_date, sent_via, is_acknowledged
- **Actions:** Create instructions, send to client, track acknowledgment

**Screen: Session Notes** (`/session-notes`) — Therapy Mode
- **Data:** customer_id, staff_id, booking_id, title, content, is_private, session_date
- **Actions:** Create note, edit, mark private

**Screen: Progress Tracking** (`/progress-tracking`) — Therapy Mode
- **Data:** customer_id, staff_id, metric_name, metric_value, notes, photo_url, tracked_at
- **Actions:** Record metric, upload photo, view timeline

---

#### CUSTOMER PORTAL

**Screen: Customer Home** (`/portal`)
- **Sections:** Upcoming bookings, loyalty summary, quick re-book

**Screen: Customer Bookings** (`/portal/bookings`)
- **Sections:** Active/past bookings, cancel/reschedule

**Screen: Customer Loyalty** (`/portal/loyalty`)
- **Sections:** Points balance, tier status, available rewards

**Screen: Customer Reviews** (`/portal/reviews`)
- **Sections:** Past reviews, write new review

**Screen: Customer Referrals** (`/portal/referrals`)
- **Sections:** Referral code, referral status, rewards earned

**Screen: Customer Profile** (`/portal/profile`)
- **Sections:** Edit name, phone, email, style preferences

---

### 2C. Reusable Component Breakdown

| Component | Props/Data | Actions/Events | Used In |
|-----------|-----------|----------------|---------|
| **KPI StatCard** | title, value, trend%, icon, color | Click → navigate | Dashboard |
| **RevenueChart** | chartData[], period | Toggle period | Dashboard, Finance, Reports |
| **TopServicesChart** | serviceData[] | — | Dashboard, Reports |
| **PaymentMethodsChart** | paymentData[] | — | Dashboard, Finance |
| **StaffLeaderboard** | staffData[] | Click staff → profile | Dashboard, Scorecards |
| **DataTable** | columns[], data[], pagination | Sort, filter, select | All list pages |
| **SearchFilter** | placeholder, value | onChange, onClear | Clients, Staff, Services |
| **Pagination** | currentPage, totalPages | onPageChange | All list pages |
| **CategoryToggle** | categories[], selected[] | onToggle | Navbar, Settings |
| **DialPad** | — | onDial, onCall, onHangup | Call Centre |
| **QRGenerator** | value, size | — | QR Attendance |
| **QRScanner** | — | onScan(data) | QR Clock Mode |
| **Calendar** | events[], view | onDateSelect, onEventClick | Bookings, Schedule |
| **FormDialog** | title, fields[], onSubmit | Submit, Cancel | All CRUD modules |
| **ConfirmDialog** | message, onConfirm | Confirm, Cancel | Delete actions |
| **CurrencyPicker** | selected, currencies[] | onChange | Pricing, POS |
| **LanguageSwitcher** | currentLang | onChange | Navbar |
| **ThemeToggle** | — | onToggle | Navbar |
| **AiInsightsWidget** | context | — | Dashboard |
| **FeatureGate** | feature, plan | — | Route wrappers |

---

### 2D. State Management

#### Global State (React Context)

| Context | Data | Persisted | Source |
|---------|------|-----------|--------|
| **AuthProvider** (or server session) | user, session, loading | httpOnly session cookie (Sanctum) or secure token store | Laravel `GET /api/v1/me` + Next.js session refresh |
| **BusinessCategoryProvider** | categories[], terms, label, theme | localStorage `business_categories` | User selection / subscription sync |
| **I18nProvider** | locale, translations, t() | localStorage `locale` | Browser language / user choice |

#### Server State (TanStack React Query)

| Query Key | Data | Stale Time | Used By |
|-----------|------|-----------|---------|
| `["subscription", userId]` | Subscription plan, status, business_type | 5 min | Feature gates, plan display |
| `["user-roles", userId]` | AppRole[] | 5 min | Sidebar visibility, route guards |
| `["organization-id", userId]` | organization_id | 30 min | All data queries |
| `["bookings"]` | Booking[] | Real-time | Bookings page, Dashboard |
| `["services"]` | Service[] | 5 min | Services page, POS, Booking form |
| `["staff"]` | Staff[] | 5 min | Staff page, Booking form |
| `["customers"]` | Customer[] | 5 min | Clients page, POS |
| `["reviews"]` | Review[] | 5 min | Reviews page, Dashboard |

#### Real-time Updates (production)
- **Staff Chat:** Laravel Echo + **Soketi** (or managed Pusher) private channel `org.{id}.chat`, events on `staff_chat_messages`
- **Queue Board:** Broadcast events when walk-in `bookings` change (`is_walkin`, `status`); client invalidates TanStack Query or merges payload
- **Notifications:** Same pattern — `user.{id}` private channel or org-scoped fanout + optional SSE fallback

#### Demo / staging data (non-production only)
- Prototype used `useDemoFallback` for empty states; **production** uses explicit empty states and **seed scripts** in staging — never silent fake production data.


---

## 3. Backend Architecture

### 3A. Core Services

#### Auth Service (Laravel)
- **Responsibilities:** User signup, login, password reset, session management, OAuth (e.g. Google)
- **Data:** `users` (Laravel), `profiles`, `user_roles` (application tables in PostgreSQL)
- **Flow:** Signup → transaction or domain listener → profile, default `user_roles` (customer), organization, `organization_members`, `subscriptions` (trial) — equivalent to legacy `handle_new_user()` trigger semantics
- **Dependencies:** Mailer for verification, rate limiter, optional Turnstile verification on public signup

#### Booking Service
- **Responsibilities:** CRUD bookings, multi-service bookings, availability checking, status transitions
- **Data:** `bookings`, `booking_services`, `staff_schedules`
- **Dependencies:** Staff Service (availability), Customer Service (client lookup)
- **Key function:** `check_staff_availability(staff_id, date, start_time, end_time)`

#### Queue Service
- **Responsibilities:** Walk-in queue management, real-time position tracking
- **Data:** `bookings` (is_walkin = true, status = 'scheduled')
- **Dependencies:** Booking Service

#### Payment Service
- **Responsibilities:** Process payments, track transactions, M-Pesa STK push
- **Data:** `transactions`, `gift_card_redemptions`
- **Dependencies:** M-Pesa Daraja client in Laravel; **Horizon** jobs for reconciliation; idempotency store (Redis)

#### CRM Service
- **Responsibilities:** Customer profiles, loyalty points, visit history, style preferences
- **Data:** `customers`, `loyalty_rewards`, `referrals`
- **Dependencies:** Booking Service (visit tracking)

#### Inventory Service
- **Responsibilities:** Stock tracking, reorder alerts, consumption tracking, supplier management
- **Data:** `inventory`, `retail_products`
- **Dependencies:** None

#### Reporting Service
- **Responsibilities:** Aggregate analytics, generate reports, export data
- **Data:** Cross-table aggregation queries
- **Dependencies:** All other services (read-only)

#### Communication Service (Haus Connect)
- **Responsibilities:** WhatsApp messaging, SMS reminders, call centre features
- **Implementation:** Laravel **queued jobs** (Twilio / Africa's Talking / Meta APIs); **no** Lovable connector in production
- **Dependencies:** Customer Service (phone numbers), Redis, provider credentials in secrets manager

---

### 3B. Async workers & webhooks (replaces Edge Functions)

| Work unit | Laravel mechanism | Purpose | Auth / safety |
|-----------|-------------------|---------|----------------|
| M-Pesa STK | `POST /api/v1/.../payments/mpesa/stk` + callback route | Initiate and confirm STK | IP allowlist + signature + idempotency |
| SMS / reminders | Horizon job `SendBookingReminder` (cron-scheduled) | 24h / 1h reminders | Rate limits per provider |
| WhatsApp inbound | `POST /webhooks/whatsapp` controller → dispatch job | Bot + templates | Provider signature validation |
| AI insights | Optional `POST /api/v1/.../insights` → queued job calling OpenAI/Gemini with **tenant** API key or platform pool + budget | Forecasts, copy | Auth + plan feature gate |

Scheduled reminders use **`php artisan schedule:run`** (scheduler container) enqueueing batch jobs, not a single long Edge Function loop.

---

## 4. Database Design

### 4A. Complete Table Reference

#### Core Identity Tables

**`organizations`**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | uuid | No | gen_random_uuid() | PK |
| name | text | No | — | Business name |
| owner_id | uuid | No | — | FK to auth.users |
| created_at | timestamptz | No | now() | — |
| updated_at | timestamptz | No | now() | — |

**`organization_members`**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | uuid | No | gen_random_uuid() | PK |
| organization_id | uuid | No | — | FK → organizations |
| user_id | uuid | No | — | FK → auth.users |
| created_at | timestamptz | No | now() | — |

**`profiles`**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | uuid | No | — | PK (= auth.users.id) |
| full_name | text | No | — | Display name |
| email | text | Yes | — | Contact email |
| phone | text | Yes | — | Phone number |
| avatar_url | text | Yes | — | Profile photo |
| branch_id | uuid | Yes | — | FK → branches |
| created_at | timestamptz | No | now() | — |
| updated_at | timestamptz | No | now() | — |

**`user_roles`**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | FK → auth.users |
| role | app_role | No | — | Enum: ceo, director, branch_manager, senior_barber, junior_barber, receptionist, customer |
| UNIQUE(user_id, role) |

**`subscriptions`**
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | uuid | No | gen_random_uuid() | PK |
| organization_id | uuid | No | — | FK → organizations (1:1) |
| plan | subscription_plan | No | 'starter' | Enum: starter, professional, enterprise |
| status | subscription_status | No | 'trial' | Enum: trial, active, past_due, cancelled, expired |
| business_type | business_type | No | 'barber' | Enum: barber, beauty, both (+ pending: nail_bar, clinic, mobile, therapy) |
| trial_ends_at | timestamptz | Yes | — | Trial expiry |
| current_period_start | timestamptz | No | now() | Billing period start |
| current_period_end | timestamptz | Yes | — | Billing period end |
| mpesa_phone | text | Yes | — | M-Pesa payment phone |
| last_payment_at | timestamptz | Yes | — | Last successful payment |

#### Service & Booking Tables

**`services`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant isolation |
| branch_id | uuid (FK) | Optional branch scope |
| name | text | Service name |
| category | text | Mode-specific category |
| price_kes | numeric | Price in KES |
| duration_minutes | integer (default 30) | Duration |
| description | text | Service description |
| image_url | text | Service photo |
| is_active | boolean (default true) | Visibility toggle |

**`bookings`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant isolation |
| customer_id | uuid (FK → customers) | Client |
| staff_id | uuid (FK → staff) | Assigned staff |
| service_id | uuid (FK → services) | Primary service (legacy) |
| branch_id | uuid (FK → branches) | Branch location |
| booking_date | date | Appointment date |
| start_time | time | Start time |
| end_time | time | Calculated end time |
| status | booking_status | scheduled/confirmed/in_progress/completed/cancelled/no_show |
| is_walkin | boolean (default false) | Walk-in flag |
| notes | text | Booking notes |
| created_by | uuid | Staff who created |

**`booking_services`** (Multi-service junction)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| booking_id | uuid (FK → bookings) | Parent booking |
| service_id | uuid (FK → services) | Service |
| staff_id | uuid (FK → staff) | Optional per-service staff |
| price_kes | numeric | Price at time of booking |
| duration_minutes | integer | Duration at time of booking |
| sort_order | integer | Service sequence |
| organization_id | uuid | Tenant isolation |

**`staff`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant |
| user_id | uuid | Linked auth user (optional) |
| full_name | text | Name |
| email, phone | text | Contact |
| role | app_role | Job role |
| specialties | text[] | Service specialties |
| commission_rate | numeric (default 30) | Commission % |
| bio | text | Staff bio |
| avatar_url | text | Photo |
| slug | text | URL-friendly name |
| branch_id | uuid (FK) | Assigned branch |
| is_active | boolean | Active status |

**`staff_schedules`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| staff_id | uuid (FK → staff) | Staff member |
| schedule_date | date | Date |
| start_time | time (default '08:00') | Shift start |
| end_time | time (default '20:00') | Shift end |
| is_day_off | boolean | Day off flag |
| notes | text | Schedule notes |
| branch_id, organization_id | uuid (FK) | Scope |

**`customers`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant |
| user_id | uuid | Linked auth user (for portal) |
| full_name | text | Name |
| phone, email | text | Contact |
| style_preferences | text | Client preferences |
| notes | text | Internal notes |
| loyalty_tier | loyalty_tier | bronze/silver/gold/platinum |
| loyalty_points | integer (default 0) | Current points |
| total_visits | integer (default 0) | Visit count |
| total_spent | numeric (default 0) | Lifetime spend |
| last_visit_at | timestamptz | Last visit |
| referral_code | text | Unique referral code |
| branch_id | uuid (FK) | Home branch |

#### Financial Tables

**`expenses`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant |
| amount_kes | numeric | Amount |
| category | text | Expense category |
| description | text | Description |
| expense_date | date | Date |
| paid_by | uuid | Staff who paid |
| receipt_url | text | Receipt image |
| branch_id | uuid (FK) | Branch |

**`tips`**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant |
| staff_id | uuid (FK → staff) | Recipient |
| customer_id | uuid (FK) | Tipper |
| booking_id | uuid (FK) | Related booking |
| amount_kes | numeric | Tip amount |
| payment_method | text | Cash/M-Pesa/Card |
| tip_date | date | Date |
| notes | text | — |

**`transactions`** ⚠️ TABLE NEEDS TO BE CREATED
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | — |
| organization_id | uuid (FK) | Tenant |
| booking_id | uuid (FK) | Related booking |
| customer_id | uuid (FK) | Payer |
| amount_kes | numeric | Transaction amount |
| payment_method | text | Cash/M-Pesa/Card/Gift Card |
| status | text | completed/pending/failed/refunded |
| reference | text | External reference (M-Pesa receipt) |
| branch_id | uuid (FK) | Branch |
| created_at | timestamptz | — |

#### Growth Tables

**`loyalty_rewards`** — Reward catalog
**`service_packages`** — Bundle definitions
**`customer_packages`** — Purchased bundles per customer
**`gift_cards`** — Issued gift cards
**`gift_card_redemptions`** — Redemption history
**`promotions`** — Promo codes
**`referrals`** — Referral tracking
**`reviews`** — Customer ratings

#### Operations Tables

**`inventory`** — Consumable stock
**`retail_products`** — Retail items for sale
**`consent_forms`** — Client consent documentation
**`staff_chat_messages`** — Real-time team messaging
**`notifications`** — User notification inbox
**`audit_log`** — Activity audit trail
**`qr_scans`** — QR attendance records
**`branches`** — Multi-location management

#### Mode-Specific Tables

**`coverage_zones`** — Mobile mode service areas
**`patient_intake`** — Clinic mode patient intake forms
**`aftercare_instructions`** — Clinic post-treatment care
**`session_notes`** — Therapy session documentation
**`progress_tracking`** — Therapy client progress metrics
**`combo_discounts`** — Multi-service discount rules

### 4B. Enums

```sql
CREATE TYPE app_role AS ENUM ('ceo', 'director', 'branch_manager', 'senior_barber', 'junior_barber', 'receptionist', 'customer');
CREATE TYPE booking_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE business_type AS ENUM ('barber', 'beauty', 'both');
-- PENDING MIGRATION: Add 'nail_bar', 'clinic', 'mobile', 'therapy' to business_type
```

### 4C. Key Relationships

```
auth.users (1) ──→ (1) profiles
auth.users (1) ──→ (N) user_roles
auth.users (1) ──→ (N) organization_members
organizations (1) ──→ (1) subscriptions
organizations (1) ──→ (N) organization_members
organizations (1) ──→ (N) branches
organizations (1) ──→ (N) [all data tables via organization_id]
branches (1) ──→ (N) staff, services, bookings, inventory, etc.
customers (1) ──→ (N) bookings, reviews, referrals, consent_forms
staff (1) ──→ (N) bookings, reviews, tips, staff_schedules, qr_scans
bookings (1) ──→ (N) booking_services
bookings (1) ──→ (N) reviews (0..1 per booking typically)
service_packages (1) ──→ (N) customer_packages
gift_cards (1) ──→ (N) gift_card_redemptions
```

### 4D. Database Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `get_user_organization_id(uuid)` | uuid | Get org_id for RLS |
| `user_org_match(uuid)` | boolean | Check if org_id matches user's org |
| `get_user_business_type(uuid)` | business_type | Get business mode from subscription |
| `get_user_plan(uuid)` | subscription_plan | Get current plan |
| `has_role(uuid, app_role)` | boolean | Role check for RLS |
| `is_staff(uuid)` | boolean | Check if user has any staff role |
| `is_management(uuid)` | boolean | Check if user is CEO/Director/BranchManager |
| `check_staff_availability(...)` | boolean | Check for booking conflicts |
| `handle_new_user()` | trigger | Auto-setup on signup |

---

## 5. API Structure

All **production** data access is via **Laravel HTTP API** (`/api/v1/...`) from the Next.js app using a typed **OpenAPI client** (or hand-maintained fetch layer). **Authorization** is enforced in Laravel (Policies, middleware, global scopes on `organization_id`); optional supplementary Postgres RLS may exist but is **not** the primary application boundary.

### Auth APIs (`/api/v1/auth/*` or Sanctum defaults)

| Operation | Method | REST endpoint (example) | Purpose |
|-----------|--------|-------------------------|---------|
| Sign up | POST | `/api/v1/auth/register` | Create user + org bootstrap |
| Sign in (email) | POST | `/api/v1/auth/login` | Issue session cookie or token pair |
| Sign in (Google) | GET/POST | `/api/v1/auth/google` / callback | OAuth |
| Sign out | POST | `/api/v1/auth/logout` | Revoke session |
| Reset password | POST | `/api/v1/auth/forgot-password` | Email reset link |
| Update password | POST | `/api/v1/auth/reset-password` | Consume token |
| Current user | GET | `/api/v1/me` | User, roles, org, subscription, `features[]` |

### Data APIs (by module) — REST examples

Paths assume `organization_id` resolved from membership middleware, not from untrusted body (except public booking with signed org token).

#### Bookings
| Operation | Method | Example |
|-----------|--------|---------|
| List | GET | `/api/v1/organizations/{org}/bookings?filter[date]=2026-04-21` |
| Create | POST | `/api/v1/organizations/{org}/bookings` |
| Update status | PATCH | `/api/v1/organizations/{org}/bookings/{id}` |
| Add line items | POST | `/api/v1/organizations/{org}/bookings/{id}/services` |
| Check availability | POST | `/api/v1/organizations/{org}/availability/check` (body: staff, window) — may call DB function `check_staff_availability` internally |

#### Services
| Operation | Method | Example |
|-----------|--------|---------|
| List | GET | `/api/v1/organizations/{org}/services?filter[is_active]=true` |
| Create | POST | `/api/v1/organizations/{org}/services` |
| Update | PATCH | `/api/v1/organizations/{org}/services/{id}` |
| Delete | DELETE | `/api/v1/organizations/{org}/services/{id}` |

#### Staff
| Operation | Method | Example |
|-----------|--------|---------|
| List | GET | `/api/v1/organizations/{org}/staff` |
| Create | POST | `/api/v1/organizations/{org}/staff` |
| Update | PATCH | `/api/v1/organizations/{org}/staff/{id}` |

#### Customers
| Operation | Method | Example |
|-----------|--------|---------|
| List / search | GET | `/api/v1/organizations/{org}/customers?filter[phone]=` |
| Update loyalty | PATCH | `/api/v1/organizations/{org}/customers/{id}` |

#### Webhooks & internal (not called from Next.js directly)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhooks/mpesa/callback` | POST | Safaricom STK result — validate, idempotent upsert |
| `/webhooks/whatsapp` | POST | Meta / Twilio inbound messages |
| `/internal/horizon` | — | Queue workers (secured network only) |

Full OpenAPI bundle and pagination/error conventions live in **contracts** package — see [full-stack-implementation-master-plan.md](./full-stack-implementation-master-plan.md).

---

## 6. System Logic & Flows

### 6.1 Appointment Booking Flow
1. Client selects service(s) → system calculates total duration & price
2. Client selects preferred staff (or "Any Available")
3. System queries `staff_schedules` for available slots on selected date
4. System calls `check_staff_availability()` to verify no conflicts
5. Client selects time slot
6. System creates `bookings` record (status: 'scheduled')
7. System creates `booking_services` records for each service
8. Optional: Apply combo discount if `min_services` threshold met
9. Send confirmation (in-app notification, optional SMS/WhatsApp)
10. If walk-in: `is_walkin = true`, skip time selection, add to queue

### 6.2 Walk-in Queue Handling (Barber/Nail Bar Mode)
1. Receptionist adds walk-in client (existing or new customer)
2. System creates booking with `is_walkin = true`, `status = 'scheduled'`
3. Queue position = count of unserved walk-ins ordered by `created_at`
4. Real-time: Laravel broadcasts `WalkInQueueUpdated` to Soketi; clients patch TanStack cache or refetch
5. Staff picks "Serve Next" → updates status to 'in_progress'
6. On completion → status to 'completed', calculate commission, award loyalty points
7. If client leaves: status to 'cancelled'

### 6.3 Staff Assignment Logic
1. If client chose specific staff → assign directly after availability check
2. If "Any Available" → find staff with:
   a. Matching specialties for selected service category
   b. Active schedule on booking date
   c. No conflicting bookings in time range
   d. Fewest bookings that day (load balancing)
3. For walk-ins: assigned when "Serve Next" is clicked

### 6.4 Payment Processing Flow
1. Staff completes service → status to 'completed'
2. POS screen shows itemized bill (services + retail products)
3. Apply applicable discounts: promo code, combo discount, loyalty reward, gift card
4. Staff selects payment method:
   - **Cash:** Record amount, calculate change
   - **M-Pesa:** Trigger STK Push via edge function → await callback → confirm
   - **Card:** Record card payment
   - **Gift Card:** Validate code, check balance, deduct amount, record redemption
   - **Split:** Multiple methods allowed
5. Create transaction record
6. Update customer: total_spent += amount, total_visits += 1, loyalty_points += calculated

### 6.5 Commission Calculation
```
staff_commission = service_price × (staff.commission_rate / 100)
```
- Commission rate stored per staff member (default 30%)
- Tips are tracked separately but shown in earnings
- Total earnings = commissions + tips
- Period: daily, weekly, monthly views

### 6.6 Inventory Deduction
1. On service completion, system checks if service has linked consumables
2. Deduct consumed quantity from `inventory` table
3. If `quantity <= reorder_level`, trigger low-stock notification
4. Track consumption per service for cost analysis

### 6.7 Mobile Service Dispatch (Mobile Mode)
1. Client books home visit → provides location address
2. System checks if address falls within any active `coverage_zone`
3. If surcharge applies, add to total price
4. Dispatch dashboard shows today's visits with addresses
5. Assign nearest available mobile pro
6. Staff confirms arrival → status to 'in_progress'
7. On completion → normal payment flow

### 6.8 Call Centre Booking (Haus Connect)
1. Receptionist opens Call Centre page
2. Uses dial pad to call client or client calls in
3. Search customer by phone number
4. If new: quick-create customer record
5. Create booking on behalf of client
6. Log call in audit_log

---

## 7. Mode-Specific Logic

### Barber Mode
- **Queue logic:** FIFO walk-in queue with real-time board updates
- **Walk-in priority:** Walk-ins added to queue; appointments always honored at scheduled time
- **Real-time:** Queue board subscribes via Echo to org-scoped queue channel
- **Unique features:** Chair utilization tracking, barber scorecards
- **Terminology:** Chair, Barber, Client, Appointment

### Beauty Mode
- **Multi-service booking:** Full support via booking_services junction table
- **Staff specialization:** Staff specialties[] matched to service categories (braids, nails, makeup, etc.)
- **Consent forms:** Required for chemical treatments (waxing, perms)
- **Gallery:** Before/after transformation photos
- **Terminology:** Station, Stylist, Client, Appointment

### Nail Bar Mode
- **Add-ons logic:** Nail art, extensions as separate booking_services with individual pricing
- **Time-based pricing:** Different prices for basic vs. complex designs via service variants
- **Walk-in queue:** Supported (similar to barber)
- **Allergy forms:** Required for gel/acrylic (linked consent_forms)
- **Terminology:** Station, Nail Tech, Client, Appointment

### Clinic Mode
- **Treatment records:** `patient_intake` stores medical history, allergies, medications
- **Consent tracking:** `consent_forms` with signature capture, expiry dates
- **Aftercare:** `aftercare_instructions` sent post-procedure with follow-up dates
- **Before/After gallery:** Clinical outcome documentation
- **Higher price points:** Services priced in 5,000-25,000 KES range
- **Terminology:** Treatment Room, Practitioner, Patient, Consultation

### Spa Mode
- **Room/resource allocation:** Treatment rooms tracked via station terminology
- **Session durations:** Longer sessions (60-90 min default vs. 30 min barber)
- **Guest experience:** Focused on loyalty, ambience gallery, packages
- **Couples packages:** Multi-person service with single booking
- **Terminology:** Treatment Room, Therapist, Guest, Session

### Mobile Mode
- **Coverage zones:** `coverage_zones` table with center_lat/lng + radius_km or area_polygon
- **Surcharge calculation:** `surcharge_kes` added per zone
- **Dispatch view:** Manager sees all today's visits on map/list with addresses
- **Staff dispatch:** Assign mobile pro considering location and travel time
- **Liability waivers:** Consent forms for home service liability
- **No walk-ins:** Appointment-only mode
- **Terminology:** Service Area, Mobile Pro, Client, Home Visit

### Therapy Mode
- **Session notes:** `session_notes` with private/shared toggle
- **Progress tracking:** `progress_tracking` with metrics, photos, timelines
- **Intake & consent:** Shared consent_forms for therapy consent
- **Session packages:** Recurring session bundles (e.g., "10 Sessions")
- **No retail:** No retail products or inventory modules
- **Terminology:** Session Room, Therapist, Client, Session

---

## 8. Permissions & Access Control

### 8.1 Role Hierarchy

```
CEO (highest)
  └─ Director
       └─ Branch Manager
            ├─ Senior Barber/Stylist
            ├─ Junior Barber/Stylist
            └─ Receptionist
Customer (separate portal, no dashboard access)
```

### 8.2 Module Access Matrix

| Module | CEO | Director | Branch Mgr | Senior Staff | Junior Staff | Receptionist | Customer |
|--------|-----|----------|------------|-------------|-------------|-------------|----------|
| Executive Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Branch Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| My Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Branches | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reports & Analytics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Finance & Expenses | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Commissions/Payroll | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Scorecards | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Haus Connect | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Services (CRUD) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Services (View) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Staff (CRUD) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Clients (View) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Clients (CRUD) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bookings (View) | ✅ | ✅ | ✅ | Own only | Own only | ✅ | Own only |
| Bookings (CRUD) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Schedule | ✅ | ✅ | ✅ | Own only | Own only | ✅ | ❌ |
| Queue | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| POS | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Loyalty | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | View |
| Packages/Gifts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Promotions | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reviews | ✅ | ✅ | ✅ | Own only | Own only | ❌ | Create |
| Gallery | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tips | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Retail Products | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Staff Chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Earnings | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| QR Clock In | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| QR Attendance | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Branding | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Customer Portal | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 8.3 RLS Policy Pattern

All tables follow this pattern:
```sql
-- SELECT: org members can view their org's data
CREATE POLICY "Org view" ON table FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

-- INSERT: staff can insert for their org
CREATE POLICY "Org staff insert" ON table FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()) AND organization_id = get_user_organization_id(auth.uid()));

-- UPDATE: staff can update their org's data
CREATE POLICY "Org staff update" ON table FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()) AND organization_id = get_user_organization_id(auth.uid()));

-- DELETE: management only
CREATE POLICY "Org mgmt delete" ON table FOR DELETE TO authenticated
  USING (is_management(auth.uid()) AND organization_id = get_user_organization_id(auth.uid()));
```

### 8.4 Staff Portal View Override
- Executive users (CEO/Director) can "impersonate" lower roles via `staff_portal_view` localStorage
- Options: barber, stylist, receptionist, branch_manager
- When set, `getEffectiveRoles()` returns the simulated role instead of real roles
- Sidebar adjusts to show only that role's modules

---

## 9. Business Rules

### 9.1 Commission Structure
- Default commission rate: 30%
- Configurable per staff member (0-100%)
- Calculated on service price only (not retail products)
- Tips not included in commission (tracked separately)
- Commission = `service_price_kes × (commission_rate / 100)`

### 9.2 Booking Conflict Prevention
- `check_staff_availability()` function prevents double-booking
- Checks: same staff + same date + overlapping time range
- Excludes cancelled and no-show bookings from conflict check
- Optional: exclude a specific booking ID (for rescheduling)

### 9.3 Cancellation Logic
- Status changed to 'cancelled'
- No-show tracked separately (status = 'no_show')
- No automatic refund logic (manual process)
- Cancelled bookings excluded from revenue calculations

### 9.4 Loyalty System
- Points awarded per visit (configurable per reward)
- Tier thresholds: Bronze (0), Silver (500), Gold (1500), Platinum (5000)
- Rewards: percentage discount, free service, product
- Points deducted on reward redemption
- Tier upgrade automatic when points threshold reached

### 9.5 Combo Discounts
- Defined in `combo_discounts` table
- `min_services`: minimum number of services in one booking
- `discount_percentage`: applied to total when threshold met
- Multiple rules can exist; best applicable discount used
- Branch-specific or organization-wide

### 9.6 Gift Card Rules
- Unique code per card
- `current_balance` decremented on each redemption
- Card becomes `is_active = false` when balance reaches 0
- Partial redemption supported
- Redemption history tracked in `gift_card_redemptions`

### 9.7 Referral Program
- Each customer gets unique `referral_code`
- New customer uses code during signup/first booking
- Referral status: pending → completed (after first visit)
- Reward (default KES 100) credited to referrer on completion
- Configurable reward amount

### 9.8 Staff Scheduling Rules
- Schedule set per staff per day
- `is_day_off = true` blocks all bookings for that day
- Working hours: start_time to end_time
- Bookings can only be made within schedule window
- Default hours: 08:00–20:00 (configurable per branch)

### 9.9 Subscription Plans

| Feature | Starter (KES 1,599/mo) | Professional (KES 2,599/mo) | Enterprise (KES 6,999/mo) |
|---------|----------------------|---------------------------|--------------------------|
| Online Booking | ✅ | ✅ | ✅ |
| Client Management | ✅ | ✅ | ✅ |
| Basic Reports | ✅ | ✅ | ✅ |
| POS & Payments | ❌ | ✅ | ✅ |
| Inventory | ❌ | ✅ | ✅ |
| SMS/WhatsApp | ❌ | ✅ | ✅ |
| Promotions/Referrals | ❌ | ✅ | ✅ |
| Multi-Branch | ❌ | ❌ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |
| Commissions/Payroll | ❌ | ❌ | ✅ |
| API Access | ❌ | ❌ | ✅ |

**Billing cycles:** Monthly (0% off), Quarterly (10% off), Annually (20% off)
**Multi-platform pricing:** Base price × number of platforms selected
**Trial:** 7 days free, all features unlocked

---

## 10. Reporting Data Structure

### Revenue Reports
- **Daily revenue:** SUM(transactions.amount_kes) GROUP BY DATE(created_at)
- **Monthly revenue:** SUM by month
- **Revenue by service:** JOIN bookings → services, SUM by service name
- **Revenue by staff:** JOIN bookings → staff, SUM by staff
- **Revenue by branch:** GROUP BY branch_id
- **Revenue by payment method:** GROUP BY payment_method

### Staff Performance
- **Bookings count:** COUNT(bookings) per staff per period
- **Revenue generated:** SUM(booking_services.price_kes) per staff
- **Average rating:** AVG(reviews.rating) per staff
- **Client retention:** COUNT(DISTINCT returning customers) / COUNT(DISTINCT total customers)
- **Attendance rate:** COUNT(qr_scans check_in) / COUNT(expected working days)
- **Tips earned:** SUM(tips.amount_kes) per staff

### Daily/Monthly Analytics
- **Booking trends:** COUNT(bookings) per day/week/month
- **Popular time slots:** COUNT(bookings) GROUP BY EXTRACT(HOUR FROM start_time)
- **New vs returning clients:** COUNT(customers WHERE total_visits = 1) vs total
- **Average booking value:** AVG(total price per booking)
- **No-show rate:** COUNT(no_show) / COUNT(total bookings)
- **Cancellation rate:** COUNT(cancelled) / COUNT(total bookings)

### Branch Comparisons
- Side-by-side metrics for all branches
- Revenue, bookings, average rating, staff count, client count per branch
- Staff utilization: booked hours / available hours per branch

---

## 11. Integrations

### M-Pesa (Laravel + Horizon)
- STK Push for customer payments and subscription billing
- Requires: Consumer Key, Consumer Secret, Shortcode, Passkey (secrets manager)
- Flow: POS → `POST .../payments/mpesa/stk` → Daraja → customer PIN → **`POST /webhooks/mpesa/callback`** → idempotent `PaymentService` → update `transactions` + booking/subscription state → broadcast to Soketi for POS UI

### WhatsApp Bot (Laravel webhook + jobs)
- `POST /webhooks/whatsapp` validates provider signature → dispatches `ProcessWhatsAppMessage` job
- Auto-reply with booking confirmation, reminders; template messages per provider rules
- Customer can: check booking status, request reschedule (bounded intents)

### SMS reminders (Horizon + scheduler)
- Cron enqueues `SendBookingReminder` batches (24h / 1h windows) — **not** an unbounded synchronous HTTP loop
- Appointment confirmation on booking create (queue job)
- Bulk campaigns via dedicated job pipeline + unsubscribe / consent flags

### AI insights (optional first-party)
- `POST /api/v1/organizations/{org}/insights` (feature-gated) enqueues job calling **OpenAI / Google** with org-scoped or pooled credentials, **budget caps**, and PII minimization in prompts
- **No** Lovable AI Gateway in production

### QR Code System
- **QR Generator:** Creates unique QR for each branch/staff
- **QR Scanner:** Camera-based scanning for clock-in/out
- **Data captured:** staff_id, scan_type, timestamp, geo coordinates, device info

---

## 12. Subscription & Billing

### Pricing Model
- **Per-platform:** Each business mode = 1 platform
- **Base prices:** Starter KES 1,599 | Professional KES 2,599 | Enterprise KES 6,999
- **Multi-platform:** Price × number of platforms
- **Discounts:** Quarterly 10% off, Annually 20% off

### Multi-Currency Support
- 60+ currencies with KES conversion rates
- Auto-detect from browser locale
- Manual currency picker available
- All prices stored in KES, converted for display

### Trial & Lifecycle
1. Signup → 7-day trial (all features)
2. Trial expires → prompt to select plan
3. Payment via M-Pesa STK Push
4. Status transitions: trial → active → past_due → cancelled/expired

---

## Appendix: Pending Migrations & TODO

1. **`transactions` table** — Needs creation (referenced but not yet in DB)
2. **`business_type` enum expansion** — Add nail_bar, clinic, mobile, therapy values
3. **Storage buckets** — Additional buckets for gallery photos, consent form signatures, receipts
4. **Calendar sync** — Google/Outlook calendar integration
5. **PWA service worker** — Offline support for mobile mode
6. **PDF generation** — Payslips, invoices, consent forms
7. **Webhook system** — External integrations (Zapier, etc.)
8. **Multi-language DB content** — Service names/descriptions in multiple languages

---

*End of Blueprint — Haus of Grooming OS v1.0*
