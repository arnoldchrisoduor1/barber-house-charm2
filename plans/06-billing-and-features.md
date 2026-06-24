# 06 — Billing, Plans & Feature Gates

Ports `src/lib/pricing.ts` and `src/hooks/useSubscription.ts` into shared contracts + Go billing module.

> **Compliance flag (platform-collect model).** The platform **holds and disburses** tenant funds (collect via Pesapal → ledger → OpenFloat payout), so we act as a payment aggregator/marketplace. This carries regulatory weight in Kenya (CBK PSP rules, AML/KYC on tenants, float/settlement handling, clear hold-period T&Cs). Treat the ledger as financial-grade: append-only, reconciled, audited. Get legal/compliance review before going live with real money.

## Plans & pricing

Base monthly KES per platform:

| Plan | KES/mo |
|------|--------|
| `solo_pro` | 999 |
| `starter` | 1,599 |
| `professional` | 2,599 |
| `enterprise` | 6,999 |

Billing cycles: `monthly` (1mo, 0%), `quarterly` (3mo, −10%), `annually` (12mo, −20%).

```
price(plan, cycle, platformCount) =
    BASE_MONTHLY_KES[plan] * platformCount * months(cycle) * (1 - discount(cycle))
```

- `platformCount` = number of selected business modes (each mode = one platform SKU).
- 2+ platforms → `business_type = both`; 1 → that platform; 0 → `barber`.
- 70+ currencies for **display only**; all amounts stored in KES, converted on the client via `rateFromKES` + `detectCurrency()`.
- Trial: 7 days, all features unlocked.

These constants live in `packages/contracts/domain/pricing.json` and are imported by both apps. Go is authoritative when charging.

## Feature → minimum plan map

```jsonc
// packages/contracts/domain/features.json
{
  "online_booking":            "starter",
  "client_management":         "starter",
  "basic_reports":             "starter",
  "email_support":             "starter",
  "pos_payments":              "professional",
  "inventory_tracking":        "professional",
  "sms_reminders":             "professional",
  "promotions_referrals":      "professional",
  "priority_support":          "professional",
  "multi_branch":              "enterprise",
  "advanced_analytics":        "enterprise",
  "custom_branding":           "enterprise",
  "api_access":                "enterprise",
  "staff_commissions_payroll": "enterprise"
}
```

Plan hierarchy for comparison: `["solo_pro","starter","professional","enterprise"]`.

```go
func HasFeature(plan string, feature string) bool {
    min, ok := featureMinPlan[feature]
    if !ok { return false }
    return planRank[plan] >= planRank[min]
}
```

> **Cleanup from prototype:** `AppLayout.tsx` had a duplicate `FEATURE_PLAN_MAP` parallel to `FEATURE_MIN_PLAN`. In the rewrite there is **one** map (`features.json`); the sidebar and the server both read it. No drift allowed.

## Feature-gated routes (parity with the 16 `PG` routes)

| Feature | Routes |
|---------|--------|
| `pos_payments` | `/pos`, `/reconciliation`, `/price-lock` |
| `inventory_tracking` | `/inventory`, `/consumption`, `/suppliers` |
| `promotions_referrals` | `/promotions`, `/referrals` |
| `multi_branch` | `/branches` |
| `staff_commissions_payroll` | `/commissions`, `/payroll` |
| `advanced_analytics` | `/scorecards`, `/call-centre`, `/audit-log` |
| `custom_branding` | `/branding` |
| `sms_reminders` | `/whatsapp` |

## Subscription lifecycle

```
trial (7d) --> active --> past_due --> cancelled | expired
```

- **Pesapal** for SaaS payment (tenant → platform); customer picks M-Pesa or bank in the Pesapal flow. Idempotent IPN (verified via `GetTransactionStatus`) updates `subscriptions.status`, `last_payment_at`, `current_period_*`. See `07-realtime-jobs-integrations.md` for the full flow.
- Dunning: scheduled asynq job moves `active`→`past_due` after grace, then `expired`; sends reminders.
- Plan changes force a `GET /me` refetch on the client (short stale time) so feature gates update immediately.

## Billing module (Go)

```text
modules/billing/
  service.go     # ComputePrice, ChangePlan, StartTrial, HandlePesapalIPN (idempotent)
  repository.go  # subscriptions CRUD (org-scoped)
  features.go    # embeds features.json, HasFeature, FeaturesForPlan
```

Payment gateway code is shared (POS + billing both use it) under `modules/integrations/pesapal/`:
`auth.go` (token cache), `order.go` (SubmitOrderRequest), `ipn.go` (RegisterIPN + handle), `status.go` (GetTransactionStatus). Idempotency keyed on `OrderMerchantReference`.

Server is the **only** place a charge or entitlement is decided. The client never sends `plan` or `amount` to be trusted; the server computes price from `pricing.json` and reads the plan from the DB/cache keyed by `organization_id`. Pesapal order amounts are always server-computed.
