# Tests Directory

This directory contains comprehensive test suites for CryptoBOM SaaS.

## 📁 Structure

```
tests/
├── api_test.go           # Main API tests (existing)
├── integration/          # Integration tests
├── unit/                 # Unit tests
├── enterprise/          # Enterprise-specific tests
├── compliance/          # Compliance framework tests
└── mocks/               # Mock implementations
```

## 🧪 Running Tests

### All Tests
```bash
go test ./tests/... -v
```

### Unit Tests Only
```bash
go test ./tests/unit/... -v
```

### Integration Tests
```bash
go test ./tests/integration/... -v
```

### With Coverage
```bash
go test ./tests/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Enterprise Tests
```bash
go test ./tests/enterprise/... -v -tags=enterprise
```

## 📋 Test Categories

### API Tests (`api_test.go`)
- Health endpoint tests
- CBOM CRUD operations
- Asset management
- Authentication
- Quantum integration
- Metrics and benchmarks

### Integration Tests (`integration/`)
- End-to-end workflows
- Database integration
- Kubernetes integration
- DevSecOps pipeline tests

### Unit Tests (`unit/`)
- Core engine tests
- Algorithm analysis
- Compliance validation
- Asset discovery

### Enterprise Tests (`enterprise/`)
- IBM Quantum integration
- SSO/SAML authentication
- Advanced compliance
- TÜV certification tests

---

**© 2026 RivicQ GmbH. All Rights Reserved.**
