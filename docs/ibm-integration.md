# IBM Cloud Integration Guide

This document describes the CryptoBOM integration with IBM Cloud services, focusing on IBM Hyper Protect Crypto Services (HPCS) and the IBM Quantum Network.

## Architecture Overview

```
CryptoBOM SaaS (GKE / GCP)
        │
        │  HTTPS / gRPC (mTLS)
        ▼
IBM Cloud API Gateway (eu-de / Frankfurt)
        │
   ┌────┴──────────────────────────┐
   │                               │
   ▼                               ▼
IBM HPCS (FIPS 140-4 Lv.4)   IBM Quantum Network
   │                               │
   │ Keep Your Own Key (KYOK)      │ Quantum random / PQC circuits
   ▼                               ▼
CryptoBOM Key Vault          Entropy Feed / Algorithm Validation
```

## Services Used

| Service | Purpose | Terraform Resource |
|---|---|---|
| IBM Hyper Protect Crypto Services (HPCS) | FIPS 140-4 Level 4 HSM — master key custody (Keep Your Own Key) | `ibm_resource_instance.hpcs` |
| IBM Key Protect | Managed key lifecycle for non-HSM workloads | `ibm_resource_instance.key_protect` |
| IBM Cloud Object Storage | Immutable audit log archive | `ibm_cos_bucket.cryptobom_artifacts` |
| IBM Quantum Network API | Post-quantum readiness testing, QRNG entropy | External API (see below) |

## HPCS Setup (Master Key Ceremony)

HPCS requires an out-of-band **master key ceremony** to initialize the HSM partition. This cannot be automated by Terraform.

Steps:
1. Install `ibmcloud` CLI and the `tke` plug-in: `ibmcloud plugin install tke`
2. After `terraform apply`, retrieve the instance: `ibmcloud resource service-instance cryptobom-hpcs-production`
3. Follow the IBM [Initializing HSM](https://cloud.ibm.com/docs/hs-crypto?topic=hs-crypto-initialize-hsm) guide
4. Load master key parts from offline smartcards (required for FIPS Level 4 compliance)
5. After initialization, record the instance CRN for use in Key Protect / COS bindings

## Key Protect Key Lifecycle

```bash
# Create a root key
ibmcloud kp key create cryptobom-root-key \
  --instance-id "$KEY_PROTECT_INSTANCE_ID" \
  --key-material "$(openssl rand -base64 32)"

# Wrap a data key
ibmcloud kp key wrap "$ROOT_KEY_ID" \
  --instance-id "$KEY_PROTECT_INSTANCE_ID" \
  --plaintext "$(openssl rand -base64 32)"
```

The wrapped key is stored in Secret Manager (GCP) or COS. At runtime, the app calls Key Protect to unwrap the key before use.

## IBM Quantum Network Integration

CryptoBOM uses the IBM Quantum Network for:
1. **Quantum Random Number Generation (QRNG)**: seeding the application's CSPRNG for key generation
2. **Algorithm benchmarking**: validating PQC candidate implementations against quantum simulators
3. **Readiness assessment**: tracking quantum threat timelines for compliance reports

### API Configuration

```yaml
# demo-config.yaml (or Secret Manager)
ibm_quantum:
  api_url: "https://auth.quantum-computing.ibm.com/api"
  api_key: "${IBM_QUANTUM_API_KEY}"   # from Secret Manager, never in source
  backend: "ibm_brisbane"             # or "simulator" for dev
  shots: 1024
```

### Required Secrets

Store all credentials in GCP Secret Manager (provisioned by Terraform):

| Secret name (Secret Manager) | Description |
|---|---|
| `cryptobom-ibm-quantum-key-<env>` | IBM Quantum Network API key |
| `cryptobom-ibm-cloud-key-<env>` | IBM Cloud IAM API key |

**Never commit API keys to source control.**

## Cross-Cloud Network Connectivity

Options for connecting GKE (GCP) to IBM Cloud:

| Option | Latency | Cost | Setup Complexity |
|---|---|---|---|
| Public Internet (mTLS) | Medium | Low | Low — suitable for dev/staging |
| IBM Cloud Direct Link 2.0 | Low | High | Medium — recommended for production |
| IBM Transit Gateway | Low | Medium | Medium |

For production, use **IBM Cloud Direct Link 2.0** connected to Google Cloud Interconnect via a co-location facility.

## Next Steps

- [ ] Complete HPCS master key ceremony for production instance
- [ ] Configure IBM Cloud Direct Link for production network connectivity
- [ ] Implement QRNG entropy injection in the application's key generation path
- [ ] Enable HPCS key events forwarding to IBM Log Analysis for audit compliance
- [ ] Add IBM Security and Compliance Center (SCC) integration for automated posture scans

## Variables Reference

| Variable | Where set | Example |
|---|---|---|
| `ibm_region` | `deploy/terraform/ibm/main.tf` | `eu-de` |
| `resource_group` | `deploy/terraform/ibm/main.tf` | `cryptobom` |
| `IC_API_KEY` | Environment variable | (from IBM Cloud IAM) |
| `IBM_QUANTUM_API_KEY` | GCP Secret Manager | (from IBM Quantum Network) |
