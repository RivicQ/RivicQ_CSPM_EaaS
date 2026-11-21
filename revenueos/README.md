# RivicQ RevenueOS

RevenueOS is the commercial operations layer for RivicQ: versioned pricing, quotations, subscriptions, invoices, payments, audit engagements, partner commissions, and revenue analytics.

It is a modular Next.js 16 application backed by PostgreSQL/Prisma and Stripe Checkout/Billing. The public site at `rivicq.com` remains Framer-hosted; RevenueOS is deployed separately and linked from that site.

## Quick start

```bash
cd revenueos
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3100`. Seeded admin credentials come from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## Scripts

- `npm run dev` — local development on port `3100`
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check
- `npm test` — Vitest suite
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — create and apply a local migration
- `npm run db:deploy` — apply migrations in production
- `npm run db:seed` — seed catalogue, price books, FX rates, tax rules, and forecasts
- `npm run stripe:sync` — sync local catalogue to the configured Stripe account

## Key paths

- `app/page.tsx` — public landing page with catalogue-driven pricing
- `app/portal/page.tsx` — customer portal
- `app/admin/` — staff console
- `app/api/` — REST endpoints
- `lib/stripe.ts` — Checkout, Billing Portal, refunds, and webhook processing
- `lib/pricing.ts` — regional price resolution and quotation totals
- `lib/revenue.ts` — MRR/ARR, collected revenue, and first-ten-customer planning
- `prisma/schema.prisma` — persistent data model

## Operating rules

- Stripe defaults to `STRIPE_MODE=test`.
- No Stripe secret key is sent to the browser. Checkout endpoints return a redirect URL only.
- Prices are read from the database, never hardcoded in the UI.
- Variable-price payments require an approved, unexpired quotation.
- Webhook signatures and `livemode` are verified; processed events are never reapplied and failed events can be replayed.
- Financial records are separated by currency and by `CONTRACTED`, `INVOICED`, `COLLECTED`, and `FORECAST`.
- Forecast records are planning targets and are never reported as collected revenue.

Detailed guides live in `docs/`.
