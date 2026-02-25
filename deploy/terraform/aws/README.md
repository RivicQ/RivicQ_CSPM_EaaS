# CryptoBOM AWS Terraform Module

Provisions AWS resources for CryptoBOM SaaS, primarily **AWS CloudHSM** integration for FIPS 140-3 hardware key management and supplementary AWS infrastructure.

## Resources

| Resource | Description |
|---|---|
| `aws_vpc` | Dedicated VPC for HSM/DB workloads |
| `aws_cloudhsm_v2_cluster` | CloudHSM v2 cluster (FIPS 140-3 Level 3) |
| `aws_cloudhsm_v2_hsm` | HSM instance within the cluster |
| `aws_kms_key` | AWS KMS master key (envelope encryption) |
| `aws_db_instance` | RDS PostgreSQL 15 (encrypted, KMS-backed) |
| `aws_s3_bucket` | Artifact/log storage (server-side encrypted) |
| `aws_cloudtrail` | Audit logging for all API calls |

## CloudHSM Architecture

```
CryptoBOM App (GKE)
        │
        │  Private Connectivity (VPN / AWS Direct Connect)
        ▼
   AWS VPC (eu-central-1)
        │
   CloudHSM Cluster ── PKCS#11 / JCE / OpenSSL Engine
        │
   HSM Instance(s)     FIPS 140-3 Level 3
```

The application connects to CloudHSM via the **CloudHSM Client SDK** (PKCS#11 or JCE) over a TLS-encrypted channel. Key operations (generate, sign, decrypt) are performed inside the HSM hardware boundary — private key material never leaves the HSM.

See [`docs/ibm-integration.md`](../../../docs/ibm-integration.md) and [`docs/quantum-attestation.md`](../../../docs/quantum-attestation.md) for cross-cloud key management design.

## Prerequisites

- Terraform >= 1.5.0
- AWS credentials with IAM permissions for CloudHSM, KMS, RDS, S3, CloudTrail
- The target VPC must have at least 2 private subnets in different AZs

## Usage

```bash
cd deploy/terraform/aws

terraform init
terraform plan -var="aws_region=eu-central-1" -var="environment=production"
terraform apply
```

## Required Variables

| Variable | Description | Default |
|---|---|---|
| `aws_region` | AWS region | `eu-central-1` |
| `environment` | Environment name | `production` |
| `project` | Project name prefix | `cryptobom` |

AWS credentials are provided via standard mechanisms (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables or instance profile) — **never committed to source control**.

## Outputs

| Output | Description |
|---|---|
| `cloudhsm_cluster_id` | CloudHSM cluster ID |
| `kms_key_arn` | KMS master key ARN |
| `rds_endpoint` | RDS PostgreSQL endpoint (sensitive) |

## Connecting GKE to AWS CloudHSM

1. Establish private connectivity between GCP VPC and AWS VPC:
   - **Option A**: AWS Direct Connect + Google Cloud Interconnect (recommended for production)
   - **Option B**: Site-to-site VPN (IPsec) between GCP Cloud VPN and AWS Virtual Private Gateway
2. Install the CloudHSM Client on GKE node pools (DaemonSet or sidecar pattern)
3. Configure the PKCS#11 library path in the application or use the AWS CloudHSM JCE provider
4. Use AWS IAM Roles for service accounts (IRSA) or cross-account IAM for GKE Workload Identity

Refer to AWS CloudHSM documentation and the `docs/` directory for further details.
