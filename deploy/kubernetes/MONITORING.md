# DevSecOps Dashboard for RivicQ CryptoBOM

This directory contains configurations for the DevSecOps monitoring and observability stack, including real-time dashboards for CI/CD pipeline health, security scans, deployments, and application metrics.

## Components

### 1. Prometheus (`deploy/kubernetes/monitoring-stack.yaml`)
- **Role**: Time-series database for metrics
- **Scrapers**: Kubernetes pods (OSS & Enterprise), nodes, API server
- **Storage**: 30-day retention (configurable)
- **Port**: 9090 (internal)

### 2. Grafana (`deploy/kubernetes/monitoring-stack.yaml`)
- **Role**: Visualization and alerting
- **Dashboards**: CryptoBOM Overview, Security Scan Status, Deployment Timeline, CI/CD Pipeline Health
- **Datasources**: Prometheus
- **Port**: 3000 (LoadBalancer)
- **Admin User**: `admin` (password set via secret)

### 3. GitHub Actions Integration
- **Metrics**: Pipeline success rate, duration, failure count
- **Trigger**: Webhook from CI/CD workflows
- **Display**: Custom JSON dashboard with run history

### 4. Security Scan Aggregator
- **Input**: SBOM files (syft), SARIF reports (CodeQL, Trivy, Gosec)
- **Processing**: Parse and push metrics to Prometheus
- **Display**: Grafana panels showing vulnerability trends

## Deployment

### Prerequisites
- Kubernetes cluster (staging or production)
- `kubectl` configured and authenticated
- Prometheus Operator (optional, for advanced monitoring)

### Quick Start

1. **Create monitoring namespace and deploy stack:**
```bash
cd cryptobom-saas
kubectl apply -f deploy/kubernetes/monitoring-stack.yaml
```

2. **Create Grafana admin password secret:**
```bash
kubectl create secret generic grafana-secrets \
  --from-literal=admin-password='your-secure-password' \
  -n cryptobom-monitoring
```

3. **Verify deployments:**
```bash
kubectl get pods -n cryptobom-monitoring
kubectl get svc -n cryptobom-monitoring
```

4. **Access Grafana:**
```bash
# Get LoadBalancer external IP
kubectl get svc grafana -n cryptobom-monitoring

# Or port-forward for local access
kubectl port-forward svc/grafana 3000:3000 -n cryptobom-monitoring
# Then visit: http://localhost:3000
```

5. **Login to Grafana:**
- **Username**: admin
- **Password**: (from secret above)

## Dashboards

### CryptoBOM Overview
- **Panels**:
  - API Request Rate (req/s)
  - Error Rate (5xx errors)
  - Database Query Latency (p95)
  - Pod Restarts (last 1h)
  - Memory Usage by pod
  - CPU Usage by pod
  
### Security Scan Status
- **Data Source**: Vulnerability scan results (Trivy, CodeQL)
- **Panels**:
  - Critical vulnerabilities count (trending)
  - High-risk findings by component
  - SBOM package count and age
  - Container image scan timeline
  - Compliance status (CIS benchmarks)

### Deployment Timeline
- **Data Source**: Kubernetes events + Helm releases
- **Panels**:
  - Recent deployments (OSS & Enterprise)
  - Deployment success rate (%)
  - Rollback count (last 7 days)
  - Deployment duration (avg)
  - Active replicas vs desired

### CI/CD Pipeline Health
- **Data Source**: GitHub Actions API + webhooks
- **Panels**:
  - Latest workflow runs
  - Success rate by branch (main, develop, feature-*)
  - Test coverage trend
  - Build time histogram
  - Failed jobs (last 30 days)

## Configuration

### Prometheus Scrape Targets

Edit `deploy/kubernetes/monitoring-stack.yaml` to add custom scrape configs:

```yaml
- job_name: 'custom-app'
  static_configs:
    - targets: ['custom-app:8080']
  metrics_path: '/metrics'
  scrape_interval: 30s
```

### Grafana Data Source

Add new Prometheus datasource:
1. **Grafana UI** → **Configuration** → **Data Sources**
2. **Add data source** → **Prometheus**
3. **URL**: `http://prometheus:9090`
4. **Access**: Server (default)

### Custom Alerts

Define alert rules in `deploy/kubernetes/alerting-rules.yaml`:

```yaml
groups:
  - name: cryptobom.rules
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
```

Apply:
```bash
kubectl apply -f deploy/kubernetes/alerting-rules.yaml
```

## GitHub Actions Integration

### Webhook Setup

1. **Create GitHub Personal Access Token (PAT)**:
   - Go to **Settings** → **Developer settings** → **Personal access tokens**
   - Scopes: `repo`, `workflow`, `read:org`
   - Copy token

2. **Store as Kubernetes secret**:
```bash
kubectl create secret generic github-token \
  --from-literal=token='ghp_xxxxx' \
  -n cryptobom-monitoring
```

3. **Deploy webhook receiver** (optional Python Flask app):
```bash
kubectl apply -f deploy/kubernetes/github-webhook-receiver.yaml
```

4. **Add webhook to repository**:
   - GitHub repo → **Settings** → **Webhooks** → **Add webhook**
   - Payload URL: `https://your-webhook-endpoint/github/webhook`
   - Content type: `application/json`
   - Events: Workflows, Pull requests
   - Active: ✓

### Webhook Payload Processing

The webhook receiver parses GitHub Actions events and pushes metrics:
- Workflow run status (success, failure, cancelled)
- Job duration
- Test results
- Security scan findings

## Security

### Grafana
- **Admin Password**: Stored as Kubernetes secret, not in manifests
- **Anonymous Access**: Disabled by default
- **LDAP/OAuth**: Configure via environment variables (see Deployment)

### Prometheus
- **No authentication** by default (runs inside cluster)
- **Network Policy**: Restrict access to Prometheus from pods only
```bash
kubectl apply -f deploy/kubernetes/network-policy-monitoring.yaml
```

### Secrets
- **Grafana passwords**: Use strong, randomly generated values
- **API tokens**: Store in encrypted Kubernetes secrets
- **TLS**: Use TLS ingress for external access

## Maintenance

### Backup Grafana Dashboards
```bash
# Export all dashboards
kubectl get configmap grafana-dashboards -n cryptobom-monitoring -o yaml > dashboards-backup.yaml

# Import later
kubectl apply -f dashboards-backup.yaml
```

### Scale Prometheus Storage
```bash
# Check current storage usage
kubectl exec -it prometheus-<POD> -n cryptobom-monitoring -- df -h /prometheus

# Increase retention or storage
kubectl patch sts prometheus -n cryptobom-monitoring --type merge -p '{"spec":{"template":{"spec":{"containers":[{"name":"prometheus","args":["--storage.tsdb.retention.time=90d"]}]}}}}'
```

### Upgrade Components
```bash
# Update image versions in monitoring-stack.yaml
# - prom/prometheus:v2.45.0 → v2.50.0
# - grafana/grafana:10.0.0 → 10.2.0

kubectl apply -f deploy/kubernetes/monitoring-stack.yaml
kubectl rollout status deployment/prometheus -n cryptobom-monitoring
kubectl rollout status deployment/grafana -n cryptobom-monitoring
```

## Troubleshooting

### Grafana login fails
```bash
# Reset admin password
kubectl exec -it grafana-<POD> -n cryptobom-monitoring -- \
  grafana-cli admin reset-admin-password newpassword
```

### Prometheus not scraping metrics
```bash
# Check Prometheus config
kubectl logs prometheus-<POD> -n cryptobom-monitoring

# View scrape targets
kubectl port-forward svc/prometheus 9090:9090 -n cryptobom-monitoring
# Visit: http://localhost:9090/targets
```

### Disk space warning
```bash
# Delete old Prometheus data
kubectl exec prometheus-<POD> -n cryptobom-monitoring -- \
  rm -rf /prometheus/wal /prometheus/chunks_head
```

## Next Steps

1. **Alerting**: Set up Slack/PagerDuty integration for critical alerts
2. **Retention**: Configure multi-week data retention and archival
3. **High Availability**: Deploy Prometheus with redundancy and Thanos for long-term storage
4. **Custom Exporters**: Add exporters for business metrics (deployments/day, MTTR, etc.)
5. **GitOps**: Manage dashboards via Kustomize/Helm for IaC compliance

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Kubernetes Monitoring Best Practices](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/)
- [GitHub Actions API](https://docs.github.com/en/rest/actions)

---

**Last Updated**: May 19, 2026  
**Maintained By**: DevSecOps Team  
**Status**: Production-Ready
