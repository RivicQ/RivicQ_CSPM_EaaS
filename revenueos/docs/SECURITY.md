# Security model

## Secrets

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, approval tokens, `JWT_SECRET`, and database credentials are server-side only.
- Server secrets live in a gitignored local `.env` file or a host secret manager; they are never checked in or embedded in build artifacts.
- No `NEXT_PUBLIC_` variable contains a secret. Publishable Stripe keys and hosted payment links are public by design; `sk_` and `whsec_` values are not.
- Checkout endpoints return Stripe URLs; they never return Stripe secret keys or raw payment credentials.
- Production rejects short or missing `JWT_SECRET`.

## Sessions and roles

- Passwords are hashed with bcrypt cost `12`.
- Sessions are signed HS256 JWTs with a 7-day expiry.
- A SHA-256 hash of each issued token is stored in `Session`; logout deletes it.
- Every request verifies both the JWT signature and the stored session record.
- Staff roles are `SUPER_ADMIN`, `FOUNDER`, `FINANCE_ADMIN`, `SALES_ADMIN`, and `SALES_USER`.
- Customers can only view and pay their own quotations and subscriptions.
- Refunds and Stripe sync require finance/founder level roles.

## Payments

- `STRIPE_MODE` defaults to `test`.
- Test mode rejects live keys; live mode rejects test keys.
- Live mode requires three distinct approval tokens and an HTTPS application URL.
- Catalogue prices and regional prices are resolved on the server.
- Subscription checkout accepts only monthly or annual catalogue prices.
- Quotation checkout rejects drafts, expired quotes, non-approved quotes, and any item/discount/total mismatch.
- Mutating Stripe calls carry idempotency keys.
- Refund amounts are validated against the remaining refundable balance on the server; partial refunds keep the payment active until fully refunded.

## Webhooks

- Raw request bodies are verified with Stripe signatures.
- Event `livemode` must match `STRIPE_MODE`.
- `StripeEvent.id` is unique; processed events are not reapplied.
- Failed, received, and stale processing events can be replayed safely; duplicates are rejected.
- Failed events remain in the database with attempts and error text for replay.

## Auditability

`AuditLog` records login, registration, product and price changes, quotation changes, checkout creation, refunds, and staff views. Financial state is persisted in `Payment`, `Invoice`, `Refund`, and `RevenueRecord`.

## Data separation

Revenue summaries are always grouped by currency. Forecast records are excluded from contracted, invoiced, and collected totals so planning targets cannot be mistaken for cash.
