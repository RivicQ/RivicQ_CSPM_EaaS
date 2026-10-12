# Stripe integration

Payments/subscriptions using Stripe Checkout and webhook signature verification.
No raw card data ever touches the app; all card flows go through Stripe's hosted
Checkout. All webhook events are verified before processing.

## Environment

| Var | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server key (test/live) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from the Stripe dashboard |
| `STRIPE_PRICE_PRO` | Price id for Professional (e.g. `price_...`) |
| `STRIPE_PRICE_ENT` | Price id for Enterprise (e.g. `price_...`) |
| `STRIPE_SUCCESS_URL` | Redirect on success (absolute) |
| `STRIPE_CANCEL_URL` | Redirect on cancel (absolute) |
| `APP_URL` | Base app URL |

## Client (`client.ts`)

Calls `POST /stripe/checkout` (see server below) and redirects to the returned
`url`. Integration point: the billing screen in the web app can use this helper
only after the server endpoint is registered.

## Server (`stripe.go`)

A tiny Go HTTP handler that is **not wired into the app** (e.g. `cmd/server/oss/main.go`
or `internal/server` routes). To register alongside the existing Gin router:

```go
import (
  "github.com/gin-gonic/gin"
  "github.com/re1/rivicq/integrations/stripe/server"
)
r := gin.Default()
r.POST("/stripe/checkout", gin.WrapF(server.CheckoutHandler))
r.POST("/stripe/webhook", gin.WrapF(server.WebhookHandler))
```

It uses the official `stripe-go` v1 API:

- `checkout.SessionNew(...)` to create a Checkout Session with `mode=subscription`.
- `webhook.ConstructEvent(...)` to verify `STRIPE_WEBHOOK_SECRET` and reject
  forged requests (returns 400 on invalid signature). Never skip verification.
- Events are recorded for audit; idempotency is enforced by Stripe event IDs.

## PCI compliance

- Use Stripe Checkout (hosted page), not custom card forms.
- Do not log request bodies containing card data. The webhook handler reads the
  raw body for signature verification (not JSON-decoded before verification).
- Never store raw PAN, CVC, or full card details.

## Idempotency

Stripe guarantees event IDs are unique; process each `event.id` once. The
`recordStripeEvent` in `convex/http.ts` is idempotent-friendly by using `eventId`
as the key (you can enforce a unique index on the audit log's requestId).

## Testing

Use Stripe CLI (`stripe listen --forward-to localhost:8080/stripe/webhook`) with
a test webhook secret.
