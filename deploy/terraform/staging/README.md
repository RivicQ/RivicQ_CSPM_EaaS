Staging Terraform (Examples)
===========================

This folder contains example Terraform configurations to provision a staging
PostgreSQL instance on AWS (RDS) or GCP (Cloud SQL). These are templates and
require you to provide provider credentials and fill variables before running.

Usage (example for AWS):

```bash
cd deploy/terraform/staging/aws
terraform init
terraform plan -var-file=secrets.tfvars
terraform apply -var-file=secrets.tfvars
```

Do not commit cloud credentials to the repository. Use `secrets.tfvars` and
store sensitive data in your CI/CD secret store.
