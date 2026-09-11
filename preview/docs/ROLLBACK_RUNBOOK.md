# Emergency Rollback Runbook

This runbook provides step-by-step procedures for rolling back CryptoBOM deployments in case of critical issues.

## Quick Reference

| Scenario | Action |
|----------|--------|
| API not responding in production | [Rollback Production via GitHub Actions](#rollback-production-via-github-actions) |
| Database migration failed | [Manual Rollback - Kubernetes](#manual-rollback---kubernetes) |
| High error rate detected | [Automatic Rollback](#automatic-rollback) |
| Both OSS and Enterprise down | [Rollback Both Editions](#rollback-both-editions) |

---

## Automatic Rollback (Built-in)

The CI/CD pipeline automatically rolls back on deployment failure:

1. **Trigger**: Any failed smoke test after `helm upgrade`
2. **Action**: Pipeline runs `helm rollback` to previous revision
3. **Verification**: Post-rollback smoke tests confirm recovery
4. **Notification**: Slack alert sent (if configured)

**No manual action required** — the pipeline handles this automatically.

---

## Rollback Production via GitHub Actions

### Use when
- Deployment succeeded but critical bugs discovered post-deploy
- Need to quickly revert to a known-good version

### Steps

1. Go to **GitHub → Actions → Rollback Deployment**
2. Click **Run workflow**
3. Fill in:
   - **environment**: `production`
   - **edition**: `oss` / `enterprise` / `both`
   - **revision** (optional): specific revision number, or leave blank for previous
4. Click **Run workflow**
5. Monitor the logs for:
   - Rollback status: `helm rollback cryptobom-oss -n cryptobom-production`
   - Post-rollback smoke tests: `curl https://cryptobom.io/oss/healthz`
6. **Confirm**: Health checks pass and users can access the service

#### Example: Rollback both editions to previous revision
```
Environment: production
Edition: both
Revision: (leave blank)
```

---

## Manual Rollback - Kubernetes

### Use when
- GitHub Actions unavailable
- Need immediate rollback without waiting for workflow approval
- Fine-grained control required

### Prerequisites
```bash
# Configure kubectl
export KUBECONFIG=/path/to/kubeconfig-prod.yaml
kubectl get nodes  # verify connectivity
```

### Steps

#### 1. Check current deployment status
```bash
# OSS
kubectl get deployment cryptobom-server -n cryptobom-production
kubectl describe deployment cryptobom-server -n cryptobom-production
kubectl logs -n cryptobom-production --selector=app=cryptobom-server --tail=50

# Enterprise
kubectl get deployment cryptobom-server -n cryptobom-enterprise-production
kubectl logs -n cryptobom-enterprise-production --selector=app=cryptobom-server --tail=50
```

#### 2. View Helm release history
```bash
# OSS revisions
helm history cryptobom-oss -n cryptobom-production

# Enterprise revisions
helm history cryptobom-enterprise -n cryptobom-enterprise-production
```

Example output:
```
REVISION	UPDATED                     STATUS      	CHART                       	APP VERSION	DESCRIPTION
1       	Mon May 19 10:00:00 2026	superseded  	cryptobom-oss-0.1.0        	v1.3.0     	Install complete
2       	Mon May 19 10:05:00 2026	deployed    	cryptobom-oss-0.1.0        	v1.3.0     	Upgrade complete
```

#### 3. Rollback to previous revision
```bash
# OSS (rollback from revision 2 to revision 1)
helm rollback cryptobom-oss 1 -n cryptobom-production --wait --timeout=10m
kubectl rollout status deployment/cryptobom-server -n cryptobom-production --timeout=10m

# Enterprise
helm rollback cryptobom-enterprise 1 -n cryptobom-enterprise-production --wait --timeout=10m
kubectl rollout status deployment/cryptobom-server -n cryptobom-enterprise-production --timeout=10m
```

#### 4. Verify rollback completed
```bash
# Check pods are running
kubectl get pods -n cryptobom-production
kubectl get pods -n cryptobom-enterprise-production

# Check current Helm release status
helm status cryptobom-oss -n cryptobom-production
helm status cryptobom-enterprise -n cryptobom-enterprise-production
```

#### 5. Smoke tests
```bash
# API health checks
curl -f https://cryptobom.io/oss/healthz
curl -f https://cryptobom.io/enterprise/healthz

# Asset endpoint
curl -f https://cryptobom.io/oss/api/v1/assets
curl -f https://cryptobom.io/enterprise/api/v1/assets

# Dashboard
curl -f https://cryptobom.io/
```

All should return HTTP 200.

---

## Rollback Staging

Same process as production, but use:
- **Environment**: `staging` in GitHub Actions, or
- **Namespace**: `cryptobom-staging` / `cryptobom-enterprise-staging` for kubectl

### Quick command
```bash
export KUBECONFIG=/path/to/kubeconfig-staging.yaml

# View releases
helm history cryptobom-oss -n cryptobom-staging

# Rollback
helm rollback cryptobom-oss 1 -n cryptobom-staging --wait
kubectl rollout status deployment/cryptobom-server -n cryptobom-staging

# Verify
curl -f https://staging.cryptobom.io/oss/healthz
```

---

## Rollback Both Editions

If both OSS and Enterprise need rollback:

### GitHub Actions
1. Run **Rollback Deployment** workflow
2. Set **edition**: `both`
3. It will rollback both in parallel

### Manual (kubectl)
```bash
# Rollback OSS
helm rollback cryptobom-oss 1 -n cryptobom-production --wait

# Rollback Enterprise (in parallel terminal or after OSS completes)
helm rollback cryptobom-enterprise 1 -n cryptobom-enterprise-production --wait

# Verify both
kubectl rollout status deployment/cryptobom-server -n cryptobom-production --timeout=10m
kubectl rollout status deployment/cryptobom-server -n cryptobom-enterprise-production --timeout=10m

# Smoke tests for both
curl -f https://cryptobom.io/oss/healthz
curl -f https://cryptobom.io/enterprise/healthz
```

---

## Rollback Specific Revision

If you need to skip a few revisions (e.g., revert to 2 revisions ago):

### GitHub Actions
1. Run **Rollback Deployment** workflow
2. Set **revision**: `1` (or the desired revision number from `helm history`)

### Manual (kubectl)
```bash
# Get the revision you want
helm history cryptobom-oss -n cryptobom-production | grep "old-version"

# Rollback to specific revision
helm rollback cryptobom-oss <REVISION_NUMBER> -n cryptobom-production --wait
```

---

## Database Rollback (If Needed)

**Caution**: Database rollbacks are risky and should only be performed if migrations caused data corruption.

### Option 1: Restore from backup
```bash
# Get latest backup
kubectl get pvc -n cryptobom-production

# If using PostgreSQL backup: restore from PVC snapshot or backup pod
# This depends on your backup solution (e.g., Velero, manual snapshots)
```

### Option 2: Manual SQL rollback
If migrations are idempotent and reversible:
```bash
# Connect to DB pod
kubectl exec -it -n cryptobom-production deployment/postgres -- psql -U cryptobom -d cryptobom

# View migration history (if tracked in app)
SELECT * FROM schema_migrations;

# Manually rollback if needed (depends on migration design)
```

**Recommendation**: Deploy with database schema backward compatibility and use feature flags to minimize migration risks.

---

## Post-Rollback Verification Checklist

After any rollback, verify:

- [ ] Deployments are running: `kubectl get deployment -n cryptobom-production`
- [ ] Pods are healthy: `kubectl get pods -n cryptobom-production`
- [ ] Health checks pass: `curl https://cryptobom.io/*/healthz`
- [ ] API endpoints responding: `curl https://cryptobom.io/*/api/v1/assets`
- [ ] Logs are clean: `kubectl logs deployment/cryptobom-server -n cryptobom-production --tail=50`
- [ ] Slack notification sent (if configured)
- [ ] PagerDuty incident resolved (if configured)
- [ ] Post-mortem scheduled (for critical rollbacks)

---

## Incident Communication

After a rollback, notify stakeholders:

1. **Slack**: Sent automatically if `SLACK_WEBHOOK_URL` is configured
2. **PagerDuty**: Manually resolve incident or connect webhook
3. **Status Page**: Update status.cryptobom.io (if public)
4. **Email**: Send incident report to on-call team

### Example Slack notification
```
🔄 Rollback Successful
Environment: production
Edition: oss, enterprise
Revision: 1 (from 2)
Duration: 3 minutes
Status: ✓ All smoke tests passed
```

---

## Preventing Rollbacks

Best practices to avoid rollbacks:

1. **Pre-deployment testing**: Run full CI/CD pipeline (unit, integration, e2e tests)
2. **Staging validation**: Deploy to staging first, run extended smoke tests
3. **Canary deployments**: Gradually roll out to subset of users first (optional)
4. **Database safety**: Use migrations with rollback procedures, feature flags
5. **Monitoring**: Set up alerts for error rates, latency, pod restarts
6. **On-call**: Have trained DevOps engineer ready during deployments

---

## Troubleshooting

### Helm rollback fails
```bash
# Check release status
helm status cryptobom-oss -n cryptobom-production

# If stuck, try force update
helm upgrade --force cryptobom-oss ./deploy/helm/cryptobom-oss -n cryptobom-production --set image.tag=<PREVIOUS_TAG>
```

### Pods not becoming ready after rollback
```bash
# Check pod logs
kubectl logs -n cryptobom-production --selector=app=cryptobom-server --tail=100

# Check events
kubectl describe pod -n cryptobom-production <POD_NAME>

# If database connectivity issue: check DATABASE_URL secret
kubectl get secret cryptobom-secrets -n cryptobom-production -o yaml | grep DATABASE_URL | base64 -d
```

### Smoke tests timeout
```bash
# Check if service is accessible
kubectl port-forward svc/cryptobom-server 8080:8080 -n cryptobom-production &
curl http://localhost:8080/healthz
```

---

## Contacts & Escalation

- **On-call DevOps**: `@devops-oncall` in Slack
- **SRE Team**: sre@rivicq.com
- **Engineering Lead**: engineering@rivicq.com
- **Incident Commander**: use PagerDuty to escalate

---

**Last Updated**: May 19, 2026
**Maintained By**: DevSecOps Team
