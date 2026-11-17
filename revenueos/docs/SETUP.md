# Local setup

## Prerequisites

- Node.js 20.9 or newer
- PostgreSQL 16
- npm 11 or newer
- Stripe CLI for local webhook forwarding (optional until credentials exist)

## Database

Create a role and database:

```bash
psql postgres -c "CREATE ROLE rivicq WITH LOGIN PASSWORD 'change-me' CREATEDB;"
createdb -h localhost -U rivicq rivicq_revenueos
```

Set `.env`:

```dotenv
DATABASE_URL="postgresql://rivicq:change-me@localhost:5432/rivicq_revenueos?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3100"
JWT_SECRET="a-long-random-local-development-value"
STRIPE_MODE=test
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
SEED_ADMIN_EMAIL="admin@rivicq.test"
SEED_ADMIN_PASSWORD="a-long-random-local-admin-password"
SEED_ADMIN_NAME="RivicQ Founder"
```

Then run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Docker Compose

Docker Compose starts PostgreSQL, applies migrations, and runs the app:

```bash
cp .env.example .env
docker compose up --build
```

Seed separately:

```bash
docker compose run --rm migrate npx prisma db seed
```

The app is available at `http://localhost:3100`.

## First actions

1. Sign in with the seeded admin account.
2. Review `Admin -> Pricing` and confirm the `2026-11-base-v1` price book.
3. Add Stripe test credentials and register a local webhook endpoint.
4. Run `npm run stripe:sync` to create matching Stripe products and prices.
5. Create a quotation, move it to `APPROVED`, and test checkout from the customer portal.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The health endpoint is `GET /api/health`; it reports mode and whether Stripe is configured without exposing secrets.
