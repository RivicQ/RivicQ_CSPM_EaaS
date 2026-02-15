# CryptoBOM SaaS Examples

This directory contains examples for using the CryptoBOM SaaS API.

## 📁 Structure

```
examples/
├── api/              # REST API examples
├── python/           # Python SDK examples
├── java/             # Java SDK examples (Enterprise)
├── rust/             # Rust SDK examples (Enterprise)
├── kubernetes/      # Kubernetes deployment examples
├── devsecops/       # CI/CD pipeline examples
└── compliance/      # Compliance report examples
```

## 🚀 Quick Examples

### Basic Asset Discovery

```bash
# Discover assets in Kubernetes cluster
curl -X POST http://localhost:9090/api/v1/engine/discover \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["kubernetes", "container"],
    "providers": ["mock"]
  }'
```

### Compliance Scan

```bash
# Run compliance scan
curl -X POST http://localhost:9090/api/v1/engine/compliance-scan \
  -H "Content-Type: application/json" \
  -d '{
    "frameworks": ["NIST", "ISO"],
    "scope": "all"
  }'
```

## 📖 More Information

- [API Documentation](../docs/openapi.yaml)
- [Full Documentation](https://docs.rivicq.xyz)
- [Enterprise Edition](https://rivicq.xyz/enterprise)

---

**© 2026 RivicQ GmbH. All Rights Reserved.**
