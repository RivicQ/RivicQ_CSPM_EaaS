# Deployment

## Build artifacts

RevenueOS builds as a Next.js standalone application:

```bash
npm ci
npx prisma generate
npm run build
```

The Docker image uses `node:22-alpine`, generates Prisma Client during the dependency stage, and runs as the unprivileged `node` user.

## Required environment

- `DATABASE_URL` — pooled or direct PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` — public HTTPS URL used for Stripe return URLs
- `JWT_SECRET` — at least 32 characters
- `STRIPE_MODE` — `test` by default, never changed casually
- `STRIPE_SECRET_KEY` — must match `STRIPE_MODE`
- `STRIPE_WEBHOOK_SECRET` — endpoint-specific signing secret

Seed variables for first boot:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

Live-mode approval variables, all distinct and present before `STRIPE_MODE=live` is accepted:

- `FOUNDER_LIVE_APPROVAL_TOKEN`
- `DEPLOYMENT_APPROVAL_TOKEN`
- `STRIPE_LIVE_APPROVAL_TOKEN`

## Migrations

Apply migrations before starting the application:

```bash
npm run db:deploy
```

With Docker Compose, the `migrate` service runs `prisma migrate deploy` and the app waits for successful completion.

## Stripe webhook

Register the production endpoint:

```text
https://<revenueos-host>/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.finalized`
- `invoice.payment_failed`
- `charge.refunded`

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

## Live mode checklist

- `STRIPE_MODE=live`
- `sk_live_` secret key configured on the server only
- Live webhook endpoint and signing secret configured
- `NEXT_PUBLIC_APP_URL` starts with `https://`
- All three approval tokens are set and distinct
- Catalogue synced with `npm run stripe:sync`
- Test checkout, webhook replay, refund, and cancellation completed before cutover
- Backups and restore drill verified

## Relationship to `rivicq.com`

The current `rivicq.com` site is Framer-hosted. Deploying this application does not replace it. Link to the RevenueOS host from Framer, or change DNS only after the new public host and TLS certificate are verified.
