# Data Retention Policy

**Effective Date**: 2024-01-01  
**Owner**: Engineering / Compliance  
**Review Cycle**: Annual

---

## 1. Purpose

This policy defines retention schedules for all data categories processed by CryptoBOM SaaS to comply with GDPR, BSI recommendations, DORA Article 9, and customer contractual obligations.

## 2. Data Categories and Retention Periods

| Data Category | Storage Location | Retention Period | Deletion Method |
|---|---|---|---|
| Application logs (operational) | Cloud Logging | 90 days hot; 1 year cold (GCS) | Automated log sink expiry |
| Audit logs (security events) | Cloud Audit Logs → GCS | 7 years | GCS Object Lifecycle |
| Database backups | Cloud SQL automated backup | 30 days (PITR: 7 days) | Automated Cloud SQL policy |
| SBOM reports | Cloud SQL + GCS | Duration of contract + 3 years | Customer-triggered or automated |
| User PII (name, email) | Cloud SQL | Duration of account + 90 days | Soft delete → hard delete job |
| API keys (hashed) | Cloud SQL | 90 days post-revocation | Purge job |
| Compliance reports | Cloud SQL + GCS | 7 years | Manual archival + deletion |
| Terraform state | GCS | Indefinite (versioned) | Manual with Terraform destroy |
| Container images | Artifact Registry | 90 days after replacement | AR lifecycle policy |
| Kubernetes audit logs | Cloud Logging | 1 year | Log sink expiry |

## 3. GDPR Data Subject Rights

Upon verified request, CryptoBOM will:

- **Right to access**: export all personal data within 30 days
- **Right to erasure**: delete PII within 30 days (subject to legal hold)
- **Right to portability**: export in JSON/CSV format

All erasure requests are logged in the audit log with requestor, date, and outcome.

## 4. Legal Hold

Data subject to active litigation, regulatory investigation, or contractual hold is exempt from the retention schedule above. Legal holds are tracked in an internal register and reviewed quarterly.

## 5. Implementation

### Cloud Logging Retention

```bash
gcloud logging sinks create cryptobom-audit-archive \
  storage.googleapis.com/cryptobom-audit-logs \
  --log-filter='logName="projects/*/logs/cloudaudit.googleapis.com%2Factivity"' \
  --include-children
```

### GCS Lifecycle Rules (Terraform)

```hcl
resource "google_storage_bucket" "audit_logs" {
  lifecycle_rule {
    condition { age = 365 }
    action    { type = "SetStorageClass"; storage_class = "COLDLINE" }
  }
  lifecycle_rule {
    condition { age = 2555 }  # 7 years
    action    { type = "Delete" }
  }
}
```

### Database PII Purge

A scheduled Cloud Run job runs nightly to soft-delete users inactive for 90 days post-account-closure, and hard-delete soft-deleted records after the retention period.

## 6. Review

This policy is reviewed annually or upon:
- Material change in data processing activities
- New regulatory requirement
- Security incident affecting data retention
