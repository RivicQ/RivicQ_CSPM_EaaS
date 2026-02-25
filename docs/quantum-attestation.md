# Quantum Attestation — Design & Roadmap

## Status

**Baseline design — in progress.** This document describes CryptoBOM's approach to quantum-readiness and remote attestation. No full quantum resistance is claimed today; the goal is a pragmatic, standards-aligned roadmap.

---

## 1. Threat Model

### Near-term (2024–2029): Classical threats only
- Harvest-now-decrypt-later (HNDL): adversaries record encrypted data today, intending to decrypt with a future cryptographically-relevant quantum computer (CRQC)
- Relevant for long-lived secrets (certificate private keys, database encryption keys, API signing keys)

### Medium-term (2029–2034): Early CRQC
- RSA-2048 and ECDH/ECDSA become vulnerable to Shor's algorithm
- AES-128 weakened by Grover's algorithm (effective 64-bit security); AES-256 remains adequate

### Long-term (2034+): Mature CRQC
- All currently deployed asymmetric algorithms broken
- Symmetric keys < 256 bits broken or severely weakened

---

## 2. Post-Quantum Cryptography (PQC) Roadmap

CryptoBOM aligns with the NIST PQC standardization (FIPS 203/204/205, finalized 2024):

| Algorithm | Type | Status in CryptoBOM |
|---|---|---|
| ML-KEM (CRYSTALS-Kyber) — FIPS 203 | KEM / key encapsulation | Planned (GCP KMS placeholder provisioned) |
| ML-DSA (CRYSTALS-Dilithium) — FIPS 204 | Digital signature | Planned |
| SLH-DSA (SPHINCS+) — FIPS 205 | Digital signature (stateless hash) | Planned |
| AES-256-GCM | Symmetric encryption | **Active** — quantum-safe today |
| SHA-3 / SHA-512 | Hashing | **Active** — quantum-safe today |
| RSA-4096 / ECDSA | Legacy signature | Active (transition path defined below) |

### GCP KMS Placeholder

The Terraform module provisions a `pqc_key` resource as a placeholder:

```hcl
resource "google_kms_crypto_key" "pqc_key" {
  name     = "cryptobom-pqc-key"
  key_ring = google_kms_key_ring.cryptobom_keyring.id
  purpose  = "ENCRYPT_DECRYPT"
  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }
  labels = { purpose = "post-quantum", pqc_ready = "true" }
}
```

When GCP KMS natively supports ML-KEM, this resource will be updated to use the PQC algorithm.

---

## 3. Remote Attestation

Remote attestation provides cryptographic proof that a workload is running unmodified code in a trusted execution environment. CryptoBOM uses this to verify HSM clients and sensitive key-processing nodes.

### Architecture

```
Verifier (CryptoBOM Control Plane)
        ▲
        │  Attestation token (signed)
        │
 Attested Workload (GKE Node / TEE)
        │
        ├─ TPM 2.0 (GKE Shielded Nodes)
        │    • Platform Configuration Registers (PCRs)
        │    • Quote signed by TPM Endorsement Key
        │
        └─ Confidential Computing (AMD SEV-SNP / Intel TDX)
             • VM measurement (launch digest)
             • Signed attestation report
```

### GKE Shielded Nodes

CryptoBOM GKE node pools use Shielded VMs with:
- **Secure Boot**: verifies UEFI firmware and boot chain
- **vTPM**: virtual Trusted Platform Module for measured boot
- **Integrity Monitoring**: detects runtime tampering

```hcl
shielded_instance_config {
  enable_secure_boot          = true
  enable_integrity_monitoring = true
}
```

### Attestation Service Interface (Pluggable SPI)

The attestation verifier is designed as a pluggable interface to allow swapping backends:

```go
// internal/attestation/attestation.go

// Verifier is the attestation service interface.
// Implementations: TPMVerifier, ConfidentialComputeVerifier, NoOpVerifier (dev)
type Verifier interface {
    // Attest returns an attestation token for the current workload.
    Attest(ctx context.Context, nonce []byte) (*AttestationToken, error)

    // Verify validates a token received from a peer workload.
    Verify(ctx context.Context, token *AttestationToken) (*AttestationResult, error)
}

// AttestationToken carries the signed attestation evidence.
type AttestationToken struct {
    Format    string    // "tpm2-quote" | "snp-report" | "tdx-report" | "oidc"
    Evidence  []byte    // raw attestation evidence (format-specific)
    SignedAt  time.Time
    Nonce     []byte
}

// AttestationResult is the verification outcome.
type AttestationResult struct {
    Trusted      bool
    WorkloadID   string
    Measurements map[string]string // PCR values or launch digest
    ValidUntil   time.Time
}
```

### Confidential Computing (Future)

For the highest assurance, CryptoBOM will optionally run key-processing workloads inside **Confidential VMs** (AMD SEV-SNP on GCP):

```hcl
# Future: enable on node pool
confidential_nodes {
  enabled = true
}
```

This provides hardware-enforced memory encryption, preventing hypervisor-level attacks.

---

## 4. IBM Quantum Network Integration

For quantum-readiness validation, CryptoBOM integrates with the IBM Quantum Network to:
1. Run PQC algorithm simulations to benchmark performance vs. classical alternatives
2. Use Quantum Random Number Generation (QRNG) to seed key material entropy
3. Track quantum threat timeline updates for compliance reporting

---

## 5. Implementation Plan

| Phase | Timeline | Deliverable |
|---|---|---|
| 1 — Hardened Classic | Now | AES-256 + RSA-4096 HSM-backed, TLS 1.3 enforced |
| 2 — Hybrid KEM | Q2 2025 | X25519 + ML-KEM hybrid handshake for new TLS connections |
| 3 — PQC Signing | Q4 2025 | ML-DSA replaces ECDSA for internal JWT signing |
| 4 — Full PQC | 2026 | All asymmetric operations use NIST PQC algorithms |
| 5 — Attestation | 2026 | TPM-based attestation gating key access in production |

---

## 6. References

- [NIST FIPS 203 — ML-KEM](https://doi.org/10.6028/NIST.FIPS.203)
- [NIST FIPS 204 — ML-DSA](https://doi.org/10.6028/NIST.FIPS.204)
- [NIST FIPS 205 — SLH-DSA](https://doi.org/10.6028/NIST.FIPS.205)
- [Google Cloud Confidential Computing](https://cloud.google.com/confidential-computing)
- [TCG TPM 2.0 Specification](https://trustedcomputinggroup.org/resource/tpm-library-specification/)
- [IETF RATS Architecture (RFC 9334)](https://www.rfc-editor.org/rfc/rfc9334)
