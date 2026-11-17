# Stripe webhooks

Endpoint:

```text
POST /api/stripe/webhook
```

The handler reads the raw request body, verifies the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`, and records the event in `StripeEvent` before processing. A repeated event id returns `received: true, duplicate: true` without reapplying side effects.

## Events handled

| Event | Effect |
| --- | --- |
| `checkout.session.completed` | Marks payment successful, creates or links an invoice, records collected revenue |
| `checkout.session.async_payment_succeeded` | Same as completed checkout |
| `checkout.session.async_payment_failed` | Marks the linked payment failed |
| `customer.subscription.created` | Creates local subscription state |
| `customer.subscription.updated` | Synchronizes status and billing period |
| `customer.subscription.deleted` | Marks subscription canceled |
| `invoice.paid` | Links invoice and payment, records paid state |
| `invoice.finalized` | Creates or updates invoice state |
| `invoice.payment_failed` | Marks payment and invoice failed/open |
| `charge.refunded` | Creates refund record and reverses collected reporting |

## Local testing

```bash
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, then run:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger charge.refunded
```

## Failure handling

A processing error marks the `StripeEvent` as `FAILED`, increments `attempts`, and stores the error message. Stripe retries are safe because the unique event id prevents duplicate application.

## Guardrails

- No financial state is created from an unsigned or unverified event.
- Payment metadata carries `rivicqPaymentId`, `rivicqCustomerId`, and order references for reconciliation.
- Refund records carry the Stripe refund id and administrator id where applicable.
- Revenue records use integer minor units and preserve the transaction currency.
