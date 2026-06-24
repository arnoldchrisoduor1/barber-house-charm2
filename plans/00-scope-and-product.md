# 00 — Scope & Product

## What we are building

A multi-tenant SaaS operations platform for grooming/beauty/wellness/retail businesses. One core domain (organizations, branches, staff, services, customers, bookings, transactions) is re-skinned per **business mode** via labels, navigation, theme, and a few mode-specific screens.

The brand surface for a wellness/spa tenant is **Haus of Wellness** (spa mode brand label = "Haus of Spa"; the multi-mode umbrella label is "Haus of Wellness"). We ship **all 9 modes**, with wellness as the flagship visual identity.

## The 9 business modes

| Mode key | Brand label | Staff term | Client term | Booking term | Station term | Theme class |
|----------|-------------|------------|-------------|--------------|--------------|-------------|
| `barber` | Haus of Barber | Barber | Client | Appointment | Chair | (base / gold) |
| `beauty` | Haus of Beauty | Stylist | Client | Appointment | Station | `theme-beauty` |
| `spa` | Haus of Spa | Therapist | Guest | Session | Treatment Room | `theme-spa` |
| `nail_bar` | Haus of Nails | Nail Tech | Client | Appointment | Station | `theme-nail` |
| `clinic` | Haus of Aesthetics | Practitioner | Patient | Consultation | Treatment Room | `theme-clinic` |
| `mobile` | Haus of Mobile | Mobile Pro | Client | Home Visit | Service Area | `theme-mobile` |
| `therapy` | Haus of Therapy | Therapist | Client | Session | Session Room | `theme-therapy` |
| `solo_pro` | Haus of Solo Pro | Professional | Client | Appointment | Workspace | `theme-solo` |
| `products` | Haus of Products | Sales Associate | Customer | Order | Aisle | `theme-products` |

Multi-mode (`both` / 2+ categories) → umbrella label **"Haus of Wellness"**, blended theme `theme-both`.

> **Source of truth:** `MODE_TERMS` in `../../barber-house-charm/src/hooks/useBusinessCategory.tsx`. Port verbatim into `packages/contracts`.

### Mode specialization rules (from prototype)

- **`mobile`** is an umbrella that overlays a `mobileSpecialty` (`barber|beauty|spa|nail_bar|clinic|therapy`). `effectiveCategories = [mobile, specialty]`; terms and service filters follow the specialty, but nav stays `MOBILE_NAV`.
- **`solo_pro`** is a single-operator model that can start from any specialty; currently falls back to the default (barber) nav. We will give it a real merged manifest in the rewrite.

## Actors & roles

`app_role` enum: `ceo`, `director`, `branch_manager`, `senior_barber`, `junior_barber`, `receptionist`, `customer`.

- **Management** = `ceo`, `director`, `branch_manager` (these bypass nav feature gates in the prototype; server still re-checks entitlement on mutations).
- **Staff** = senior/junior + receptionist.
- **Customer** = portal-only (`/portal/*`), data scoped to `customers.user_id`.

## Two payment planes (do not conflate)

1. **Tenant → platform** — SaaS subscription (plans below), billed via **Pesapal** (M-Pesa or bank).
2. **Customer → tenant** — in-venue/online POS revenue (`transactions`), also via Pesapal.
3. **Staff compensation** — commissions, tips, payroll (inside the tenant).

## Subscription plans

| Plan | KES/mo (base, per platform) |
|------|------------------------------|
| `solo_pro` | 999 |
| `starter` | 1,599 |
| `professional` | 2,599 |
| `enterprise` | 6,999 |

Billing cycles: monthly (0%), quarterly (−10%), annually (−20%). Multi-platform price = base × platform count × months × (1 − discount). 7-day trial, all features unlocked. Details + feature matrix in `06-billing-and-features.md`.

## Route surface (target parity)

The prototype ships **154 routes**: 14 public, 2 pre-login auth, 2 post-login (onboarding/select-plan), 1 smart redirect, 9 customer portal (`CP`), 109 staff (`P`), 16 feature-gated staff (`PG`), 1 NotFound. We target **functional parity**, reorganized into Next.js route groups (see `02-frontend-nextjs.md`).

## Explicit non-goals (initial release)

- No native mobile app (PWA only if time permits).
- No Citus/sharding — shared-schema multi-tenancy with `organization_id`.
- No third-party BaaS as the production API. Go owns all business logic.
