# Incident runbooks

## Pesapal IPN failures
1. Check API logs for `payment_ipn_received` with `request_id`.
2. Verify Redis idempotency key for `OrderMerchantReference`.
3. Re-query Pesapal `GetTransactionStatus` manually; do not replay IPN body.
4. If ledger credited but booking not updated, reconcile `transactions` vs `ledger_entries`.

## Payout backlog (OpenFloat)
1. Check `payouts` where `status=pending|failed`.
2. Verify tenant wallet balance vs ledger sum.
3. Retry failed payouts only with same `merchant_reference` (idempotent).

## Database restore
1. Stop api + worker containers.
2. Restore `pg_dump` to staging first; validate ledger balances.
3. Run migrations: `go run ./cmd/migrate up`.
4. Smoke test `/health`, login, `/me`.

## Backup schedule (production)
- Nightly `pg_dump` via `infra/scripts/backup-postgres.sh` to MinIO/S3 with 30-day retention.
- Weekly restore drill on staging.

## Chaos drills
1. Kill Redis — API should report `degraded` on `/health`; queue jobs pause until Redis returns.
2. Kill worker — notifications backlog in Redis; restart worker and verify drain.
3. Duplicate IPN — idempotency store must return same outcome without double credit.

## Load testing
```bash
k6 run infra/k6/health.js
k6 run infra/k6/book-ipn.js
```

## Scale-out prep
- Externalize Postgres/Redis to managed services before multi-instance API.
- Replace in-memory WS hub with Redis pub/sub when running >1 API replica.
- Split worker fleet by queue: `notifications`, `payouts`, `reports`.

## Pen-test remediation
Track findings in issue tracker; prioritize tenancy isolation, auth cookie flags, and payment webhook verification.
