# Haus of Wellness — local development

## Quick start (Docker)

```powershell
cd infra/docker
docker compose up --build
```

Services:
- Web: http://localhost:3000
- API: http://localhost:8080/health
- MinIO console: http://localhost:9001 (minio / minio12345)
- Postgres: localhost:5432 (haus / haus)

Run migrations:

```powershell
cd apps/api
$env:DATABASE_URL="postgres://haus:haus@localhost:5432/haus?sslmode=disable"
go run ./cmd/migrate up
go run ./cmd/seed
```

## Env vars (API)

| Variable | Description |
|----------|-------------|
| DATABASE_URL | Postgres DSN |
| REDIS_URL | Redis URL |
| JWT_ACCESS_SECRET | Access token secret |
| JWT_REFRESH_SECRET | Refresh token secret |
| CORS_ORIGINS | Comma-separated origins |
| S3_ENDPOINT | MinIO/S3 endpoint |
| PESAPAL_CONSUMER_KEY | Pesapal sandbox key |
| PESAPAL_CONSUMER_SECRET | Pesapal sandbox secret |

## Monorepo scripts

```powershell
pnpm install
pnpm --filter @haus/contracts generate
cd apps/web && npm run dev
cd apps/api && go run ./cmd/api
```


# Build API + web images
docker compose -f infra/docker/compose.yml build api web

# Apply DB migrations
docker compose -f infra/docker/compose.yml run --rm migrate

# Start the full stack
docker compose -f infra/docker/compose.yml up -d

# Start Playwright E2E UI (run from apps/web)
cd apps/web
PLAYWRIGHT_BASE_URL="http://localhost:3001" PLAYWRIGHT_API_URL="http://localhost:18432" PLAYWRIGHT_CHANNEL="chromium" npm run test:e2e -- --ui