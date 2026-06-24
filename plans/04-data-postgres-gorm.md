# 04 — Data: PostgreSQL + GORM

Schema derives from the prototype's `src/integrations/supabase/types.ts` (~38 tables + 2 views + RPCs) and docs `01-data-storage-and-schema.md`. Money stored as **integer KES** unless noted.

## Enums (Postgres)

```sql
CREATE TYPE app_role AS ENUM ('ceo','director','branch_manager','senior_barber','junior_barber','receptionist','customer');
CREATE TYPE booking_status AS ENUM ('scheduled','checked_in','confirmed','in_progress','completed','no_show','cancelled');
CREATE TYPE business_type AS ENUM ('barber','beauty','both','nail_bar','clinic','mobile','therapy','solo_pro','products');
CREATE TYPE loyalty_tier AS ENUM ('bronze','silver','gold','vip');
CREATE TYPE payment_method AS ENUM ('mpesa','card','cash','gift_card');
CREATE TYPE payment_status AS ENUM ('pending','completed','failed','refunded');
CREATE TYPE subscription_plan AS ENUM ('solo_pro','starter','professional','enterprise');
CREATE TYPE subscription_status AS ENUM ('trial','active','past_due','cancelled','expired');
```

> **Fix from prototype:** the FE uses `solo_pro` and `products` business types + a `solo_pro` plan that the old Supabase enum lacked. Our migrations include them from the start.

## Table groups

| Group | Tables |
|-------|--------|
| Identity & tenancy | `organizations`, `organization_members`, `profiles`, `user_roles`, `subscriptions`, `branches` |
| Catalog & people | `services`, `staff`, `staff_schedules`, `customers` |
| Bookings | `bookings`, `booking_services`, `waitlist` |
| Money | `transactions`, `expenses`, `tips`, `gift_cards`, `gift_card_redemptions` |
| Ledger & payouts | `tenant_wallets`, `ledger_entries`, `payouts`, `payout_items` |
| Growth | `loyalty_rewards`, `service_packages`, `customer_packages`, `promotions`, `referrals`, `reviews` |
| Inventory | `inventory`, `retail_products`, `suppliers`, `consumption` |
| Ops | `staff_chat_messages`, `notifications`, `audit_log`, `qr_scans`, `consent_forms` |
| Features & platform | `features`, `organization_features`, `feature_flags`, `platform_users`, `platform_audit_log` |
| Mode-specific | `coverage_zones`, `patient_intake`, `aftercare_instructions`, `session_notes`, `progress_tracking`, `combo_discounts` |

`transactions` is **created from day one** (docs flag it as a pending table; we don't defer it).

### Ledger & payouts (platform-collect money model)

Because the platform collects all funds and later disburses via Pesapal OpenFloat (`07`), balances are tracked with a **double-entry ledger**, not a mutable counter.

- **`tenant_wallets`** — one per org: `organization_id`, `balance_kes` (derived cache), `reserve_kes`, `currency`. Balance is the sum of its ledger entries; the column is a fast cache validated against entries.
- **`ledger_entries`** — append-only: `id`, `organization_id`, `account` (`tenant_wallet|platform_clearing|platform_fee|payout_clearing`), `direction` (`debit|credit`), `amount_kes`, `transaction_id?`, `payout_id?`, `ref`, `created_at`. Every event writes balanced debit+credit rows in one tx. **Never updated or deleted.**
- **`payouts`** — `id`, `organization_id`, `amount_kes`, `status` (`pending|processing|completed|failed`), `merchant_reference` (unique, idempotency), `openfloat_ref`, `failure_reason`, timestamps.
- **`payout_items`** — links a payout to the transactions/period it settles (for statements).

Invariants: ledger always balances (Σdebits = Σcredits); a wallet can't go negative; payouts ≤ available reconciled balance; all amounts integer KES.

## Tenancy model

- **Shared database, shared schema.** Every tenant table has `organization_id uuid NOT NULL`.
- **Add `organization_id` to `branches`** (prototype types omit it — required for tenancy).
- **Composite indexes lead with `organization_id`** for every hot query. Partial indexes for common filters (e.g. `WHERE status='scheduled' AND booking_date = CURRENT_DATE`).

## GORM conventions

```go
type Base struct {
    ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

// Tenant-scoped tables embed this AND OrgScoped marker.
type Booking struct {
    Base
    OrganizationID uuid.UUID `gorm:"type:uuid;not null;index:idx_bookings_org_date,priority:1"`
    CustomerID     uuid.UUID `gorm:"type:uuid;not null"`
    StaffID        *uuid.UUID `gorm:"type:uuid"`
    BranchID       *uuid.UUID `gorm:"type:uuid"`
    BookingDate    time.Time `gorm:"type:date;index:idx_bookings_org_date,priority:2"`
    Status         string    `gorm:"type:booking_status;not null;default:scheduled"`
    IsWalkin       bool
    // ...
}
func (Booking) IsTenantScoped() {} // marker interface enforced by OrgScope
```

### The mandatory tenant scope

```go
// platform/tenancy/scope.go
func OrgScope(orgID uuid.UUID) func(*gorm.DB) *gorm.DB {
    return func(tx *gorm.DB) *gorm.DB {
        return tx.Where("organization_id = ?", orgID)
    }
}
```

Every repository for a tenant table applies `OrgScope(ctx.OrgID())`. A repo test asserts the generated SQL contains the `organization_id` predicate. CI lint forbids `db.Find`/`db.First` on tenant models outside repositories.

## Migrations

- **golang-migrate** SQL pairs (`NNNN_name.up.sql` / `.down.sql`) in `infra/migrations`.
- Zero-downtime: expand → dual-write → backfill (asynq job) → switch reads → contract.
- `gorm.AutoMigrate` only behind `APP_ENV=local` for fast iteration; never authoritative.

## RPC → service-layer functions

Supabase RPCs become Go service methods (no SQL functions needed unless perf demands):

| Supabase RPC | Go replacement |
|--------------|----------------|
| `get_user_organization_id` | `tenancy.ResolveOrganization` middleware |
| `is_management`, `is_staff`, `has_role` | `authz` policy funcs |
| `get_user_plan`, `get_user_business_type` | `billing` / `tenancy` service reads |
| `check_staff_availability` | `booking.Service.CheckAvailability` (single SQL query with overlap predicate) |

## Read scaling

- Heavy reporting via read replica (`pgsql_report` connection / separate GORM `*DB`).
- Materialized views for executive dashboards, refreshed by scheduled asynq job.
- Range-partition append-only tables (`audit_log`, `notifications`) by month later.

## Demo data

Replace the prototype's silent `useDemoFallback` with explicit empty states in the UI + a `cmd/seed` script that loads realistic demo data per mode in non-prod only.
