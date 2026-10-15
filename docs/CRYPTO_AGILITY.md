# Crypto-agility scoring (embedded & identity)

Crypto-agility is the ability of a device or identity stack to **change
algorithms** — swap a library, rotate a curve, adopt hybrids — without a
hardware or ecosystem rewrite.

## Signals RivicQ derives

From static artifact evidence, RivicQ surfaces the inputs an agility assessment
needs (it does not fabricate a single vendor score):

- **Library modularity**: does the artifact reference a swappable crypto library
  (mbedTLS, PSA Crypto, PKCS#11) vs a monolithic one?
- **API abstraction**: PSA Crypto / PKCS#11 / TF-M markers indicate a
  crypto-abstraction layer, which eases algorithm swaps.
- **Hybrid readiness**: presence of both classical and PQC algorithms.
- **Hard-coded algorithms vs negotiated**: TLS/DTLS negotiation markers vs
  fixed-algorithm strings.
- **Certificate agility**: key/signature algorithm mix and CA hierarchy depth.

## Reading the result

- `PQC readiness = ready` + a crate API present → **high agility**.
- Classical-only + no abstraction API + long lifetime → **low agility**, high
  migration cost. These are the `P0` items in the PQC plan.

## Relationship to the PQC plan

The operator workflow this engine supports is **Discover → Inventory → Classify → Prioritize → Plan**. **Execute** (key/algorithm change in production) is an authorized operator process outside this product. This repository does not rotate production keys.

Agility is the *capacity* to migrate; the PQC plan (`PQC_EMBEDDED.md`,
`PQC_IDENTITY.md`) is the *schedule* to migrate. Together they tell a partner
where to spend effort first.
