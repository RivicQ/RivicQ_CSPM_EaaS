# Contributing to CryptoBOM SaaS

**Welcome!** We're excited that you're interested in contributing to CryptoBOM SaaS. This document provides guidelines for contributing to this project.

---

## 📋 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inclusive environment for all contributors.

**Key Principles:**
- Be respectful and inclusive
- Welcome newcomers and mentors
- Accept constructive criticism gracefully
- Focus on what is best for the community

---

## 🏛️ License & Intellectual Property

CryptoBOM SaaS is licensed under the Apache License, Version 2.0. By contributing,
you agree that your contributions will be made available under the project's
license. See the root `LICENSE` file for full terms.

If you are contributing on behalf of an employer, ensure you have the right to
contribute under the project's license and follow your employer's contribution
policy.

---

## 🚀 Getting Started

### Prerequisites

- Go 1.21+ (for backend)
- Node.js 18+ and npm (for web frontend)
- Docker & Kubernetes (for deployment testing)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd cryptobom-saas

# Install Go dependencies
go mod download

# Install frontend dependencies
cd web && npm install

# Run tests
go test ./...
npm test

# Start development server
./run
```

---

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Use GitHub Issues to report bugs
- Include reproduction steps, expected vs actual behavior
- Specify environment (OS, Go version, etc.)

### 💡 Feature Requests
- Open an Issue with the "enhancement" tag
- Describe the feature and its use case
- Explain how it should work

### 📖 Documentation
- Improve README, API docs, and guides
- Add code examples
- Translate documentation

### 💻 Code Contributions

**Workflow:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests (coverage must not decrease)
5. Commit with clear messages
6. Push to your fork
7. Submit a Pull Request

---

## 📝 Pull Request Guidelines

### Before Submitting

- [ ] Tests pass (`go test ./...` and `npm test`)
- [ ] Code is formatted (`go fmt`, `npm run format`)
- [ ] Linting passes (`go vet`, `npm run lint`)
- [ ] No new warnings introduced
- [ ] Documentation updated

### PR Description

Must include:
- **What** - What does this PR change?
- **Why** - Why is this change needed?
- **How** - How does it work?
- **Testing** - How was it tested?

### Commit Messages

Use clear, descriptive commit messages:
```
feat: add quantum vulnerability scanner
fix: resolve IBMQ connection timeout
docs: update API documentation
test: add enterprise authentication tests
```

---

## 🧪 Testing Requirements

### Unit Tests
- Minimum 80% code coverage required
- Test edge cases and error conditions
- Use table-driven tests where appropriate

### Integration Tests
- Test API endpoints with real HTTP calls
- Include mock quantum providers
- Test with actual Kubernetes clusters (optional)

### Enterprise Tests
- Test SSO integration
- Test IBM Quantum connection (if credentials provided)
- Test compliance framework exports

---

## 📦 Package Structure

```
cryptobom-saas/
├── core-engine/          # Core engine implementations
│   ├── api/             # API handlers
│   ├── engine/          # Engine implementations
│   │   ├── classical/  # Classical cryptography
│   │   └── quantum/     # Quantum computing
│   └── providers/       # Quantum providers
├── web/                 # Frontend React application
├── deploy/              # Deployment configurations
│   ├── oss/             # Open Source edition
│   ├── enterprise/      # Enterprise edition
│   └── helm/           # Kubernetes Helm charts
├── tests/              # Integration tests
├── examples/           # Usage examples
└── docs/               # Documentation
```

---

## 🏢 Enterprise Features

This is the **Open Source Edition**. Enterprise features include:

- Real IBM Quantum integration
- Multi-language SDKs (Python, Java, Rust, C++, C, Ruby)
- TÜV-certified German engineering
- 24/7 Enterprise Support
- SOC 2, PCI DSS, HIPAA, FedRAMP compliance
- Full NIST PQC algorithm support
- Advanced analytics and ML features

**For Enterprise Edition:** https://rivicq.de/enterprise

---

## 📞 Getting Help

- **Issues:** https://github.com/RivicQ/RivicQ_CSPM_EaaS/issues
- **Discussions:** https://github.com/RivicQ/RivicQ_CSPM_EaaS/discussions
- **Enterprise Support:** enterprise@rivicq.de

---

**Thank you for contributing to CryptoBOM SaaS!**

_Made with ❤️ in Berlin, Germany_
