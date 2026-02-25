# CryptoBOM IBM Cloud Terraform Module

Provisions IBM Cloud resources for CryptoBOM SaaS, focusing on **IBM Hyper Protect Crypto Services (HPCS)** (FIPS 140-4 Level 4 HSM) and **IBM Cloud Object Storage**.

## Resources

| Resource | Description |
|---|---|
| `ibm_resource_instance` (hs-crypto) | IBM HPCS — highest-assurance HSM (FIPS 140-4 Level 4) |
| `ibm_resource_instance` (kms) | IBM Key Protect — managed key lifecycle |
| `ibm_resource_instance` (cloud-object-storage) | IBM COS for artifact/log storage |
| `ibm_cos_bucket` | HPCS-encrypted COS bucket |

## Prerequisites

- Terraform >= 1.5.0
- IBM Cloud API key set as `IC_API_KEY` environment variable
- IBM Cloud CLI (`ibmcloud`) for HPCS initialization (HSM requires manual master key ceremony)
- Target IBM Cloud account with resource group `cryptobom`

## Usage

```bash
cd deploy/terraform/ibm

export IC_API_KEY="<your-ibm-cloud-api-key>"

terraform init
terraform plan -var="ibm_region=eu-de" -var="environment=production"
terraform apply
```

## Required Variables

| Variable | Description | Default |
|---|---|---|
| `ibm_region` | IBM Cloud region | `eu-de` |
| `environment` | Environment name | `production` |
| `resource_group` | IBM Cloud resource group | `cryptobom` |

IBM Cloud credentials are provided via the `IC_API_KEY` environment variable — **never committed to source control**.

## Outputs

| Output | Description |
|---|---|
| `hpcs_instance_id` | HPCS instance ID |
| `cos_instance_id` | Cloud Object Storage instance ID |
| `key_protect_instance_id` | Key Protect instance ID |

## Integration Notes

See [`docs/ibm-integration.md`](../../../docs/ibm-integration.md) for:
- HPCS master key ceremony procedure
- Cross-cloud key wrapping architecture (GCP ↔ IBM)
- IBM Quantum Network integration for post-quantum readiness
