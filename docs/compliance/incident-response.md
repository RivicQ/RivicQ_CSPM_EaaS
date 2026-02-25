# Incident Response Plan

**Effective Date**: 2024-01-01  
**Owner**: Engineering / Security  
**Review Cycle**: Annual + after every Major/Critical incident

---

## 1. Severity Levels

| Level | Description | Examples |
|---|---|---|
| P1 — Critical | Production unavailable or active data breach | Database breach, ransomware, >30 min prod outage |
| P2 — High | Significant security event or degraded service | Key compromise, partial service degradation |
| P3 — Medium | Limited impact; no data exposure | Failed deployment, minor service disruption |
| P4 — Low | Informational; no immediate impact | Suspicious log entry, failed auth spike |

## 2. Response Team

| Role | Responsibility |
|---|---|
| Incident Commander (IC) | Overall coordination; communication; decisions |
| Technical Lead | Root cause analysis; containment; remediation |
| Communications Lead | Customer/stakeholder notifications |
| Security Lead | Evidence preservation; regulatory notifications |

For P1 incidents, the IC is the on-call Engineering Manager. For P2, the on-call engineer assumes IC.

## 3. Response Process

### Phase 1: Detection & Declaration (0–15 min)

- Alert received via PagerDuty / Slack #alerts
- On-call engineer triages and assigns preliminary severity
- If P1 or P2: declare incident in #incidents Slack channel, page IC
- Incident tracking ticket created (JIRA / GitHub Issue)

### Phase 2: Containment (15 min – 2 hr for P1)

- Isolate affected components (GKE namespace isolation, firewall rule, CloudSQL deny)
- Revoke compromised credentials immediately
- Preserve evidence: export relevant Cloud Audit Logs, application logs
- Enable enhanced logging if not already active
- Notify affected customers (P1: within 1 hour; P2: within 4 hours)

```bash
# Example: isolate a compromised GKE workload
kubectl -n cryptobom-system label pod <pod-name> quarantine=true
kubectl -n cryptobom-system apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine
spec:
  podSelector:
    matchLabels:
      quarantine: "true"
  policyTypes: [Ingress, Egress]
EOF
```

### Phase 3: Investigation (parallel with containment)

- Review Cloud Audit Logs for unauthorized access patterns
- Review application logs for anomalous requests
- Determine scope: affected accounts, data exposed, attack vector
- Preserve forensic evidence (do not modify affected resources until preservation confirmed)

### Phase 4: Eradication & Recovery

- Remove malicious code, revoke unauthorized access
- Patch vulnerability (per vulnerability management SLA)
- Rotate all potentially compromised secrets
- Restore from clean backup if integrity is in doubt
- Verify integrity of production deployment (Binary Authorization, container digests)

### Phase 5: Post-Incident Review

Mandatory for P1 and P2 (within 5 business days):
- Blameless post-mortem: timeline, root cause, contributing factors
- Action items with owners and due dates
- Update runbooks / detection rules as needed
- If personal data was exposed: GDPR/regulatory notification within 72 hours of confirmation

## 4. Regulatory Notifications

| Regulation | Trigger | Deadline | Contact |
|---|---|---|---|
| GDPR Article 33 | Personal data breach | 72 hours | Lead supervisory authority (BSI / BfDI) |
| DORA Article 19 | Significant ICT incident | 4 hours (initial) | Competent financial authority |
| Customer SLA | P1 outage or breach | Per contract | Account management |

## 5. Communication Templates

### Initial Internal Alert
```
[INCIDENT-{YYYY-MMDD-NN}] {SEVERITY} — {Brief description}
Status: Investigating
IC: {name}
Bridge: {link}
Impact: {describe}
```

### Customer Notification (P1)
```
Subject: CryptoBOM Service Incident — {date}

We are currently investigating an incident affecting {service}.
Impact: {brief impact description}
We will provide an update within {1 hour / 4 hours}.
```

## 6. Contact List

Maintain an up-to-date contact list in the internal wiki (not in this public document).

## 7. Testing

- Tabletop exercise: quarterly
- Full simulation: annually
- Post-exercise: update this plan within 2 weeks
