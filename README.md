# Rivic Q-Runtime - Quantum-Safe Cloud-Native Infrastructure

**[Open Source](README_OSS.md)** | **[SaaS Platform](https://rivic-q.github.io/cryptobom-saas/)** | **[Documentation](docs-oss/)**

---

## 🔒 About Rivic Q-Runtime

Rivic Q-Runtime is a **production-ready post-quantum cryptography framework** that makes your applications quantum-resistant with **zero code changes**.

### Key Highlights

✅ **NIST-Approved Algorithms** (ML-KEM, ML-DSA)  
✅ **Transparent Integration** (no app changes needed)  
✅ **Kubernetes Native** (operators & controllers)  
✅ **Real-time Observability** (CBOM generation)  
✅ **Compliance Ready** (eIDAS 2.0, DORA)  
✅ **Production Proven** (<100ms crypto operations)  

---

## 📦 Choose Your Edition

### 🌟 Open Source Edition
Free, community-supported post-quantum cryptography.

**[→ Full Documentation](README_OSS.md)**

```bash
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas
npm install
npm run test
```

**Includes:**
- Core PQC algorithms
- Kubernetes operator
- CBOM generation
- Community support
- Apache 2.0 License

---

### 🏢 SaaS Platform
Enterprise-grade managed service with 24/7 support.

**[→ Visit Platform](https://rivic-q.github.io/cryptobom-saas/)**

**Includes:**
- Managed infrastructure
- 24/7 support
- Advanced analytics
- SLA guarantees
- Custom integrations

---

## 🚀 Getting Started

### For Open Source Contributors

```bash
# Clone repository
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas

# Install & build
npm install
npm run build

# Run tests
npm run test

# Deploy to Kubernetes
kubectl apply -f k8s/manifests-oss.yaml
```

### For SaaS Users

Visit: [rivic-q.github.io/cryptobom-saas](https://rivic-q.github.io/cryptobom-saas/)
- Sign up for free
- Deploy in 5 minutes
- Get instant support

---

## 📚 Documentation

### Getting Started
- [Installation Guide](docs-oss/getting-started/installation.md)
- [Architecture Overview](docs-oss/README.md)
- [Quick Start Tutorial](docs-oss/getting-started/)

### Integration Guides
- [Kubernetes Deployment](k8s/)
- [Docker Setup](Dockerfile)
- [CI/CD Integration](src/cbom/)

### API & Reference
- [REST API Reference](API_REFERENCE.md)
- [Operator CRDs](k8s/)
- [Code Examples](examples/)

---

## 🔐 Security

- ✅ NIST post-quantum standards
- ✅ Secure-by-default configuration
- ✅ Zero-trust architecture
- ✅ Comprehensive audit logging
- ✅ Rate limiting & DDoS protection

**Report Security Issues**: security@rivic.xyz  
(Do NOT open public issues for vulnerabilities)

---

## 📊 Benchmarks

| Operation | Time |
|-----------|------|
| ML-KEM Key Generation | ~2ms |
| ML-KEM Encapsulation | ~0.8ms |
| ML-DSA Signing | ~3.5ms |
| ML-DSA Verification | ~1.2ms |

---

## 🧪 Testing

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test -- --coverage
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

- **Open Source**: Apache License 2.0 ([LICENSE](LICENSE))
- **SaaS Platform**: Proprietary (see platform terms)

---

## 🎯 Roadmap

- [ ] Hardware acceleration (TPM)
- [ ] Additional PQC algorithms
- [ ] Service mesh integration
- [ ] Multi-cloud support
- [ ] Extended CBOM formats

---

## 📞 Support & Community

### Open Source Edition
- **Documentation**: [docs-oss/](docs-oss/)
- **GitHub Issues**: [Report bugs](https://github.com/rivic-q/cryptobom-saas/issues)
- **Discussions**: [Ask questions](https://github.com/rivic-q/cryptobom-saas/discussions)
- **Community**: [Join Discord](#)

### SaaS Platform
- **Support Portal**: [SaaS Dashboard](https://rivic-q.github.io/cryptobom-saas/)
- **Email Support**: support@rivic.xyz
- **Sales Inquiries**: sales@rivic.xyz
- **Phone**: Available for enterprise customers

---

## 📈 Project Status

| Component | Status | Version |
|-----------|--------|---------|
| Core Operator | ✅ Stable | 1.0.0 |
| CBOM Generator | ✅ Stable | 1.0.0 |
| Crypto Interceptor | ✅ Stable | 1.0.0 |
| Kubernetes Support | ✅ Stable | v1 |
| Test Coverage | 85%+ | — |

---

## 🙏 Acknowledgments

- NIST for post-quantum cryptography standards
- Kubernetes community
- Open source contributors
- Banking industry partners

---

**Rivic Q-Runtime** - Making the quantum-safe future accessible to everyone.

[Website](https://rivic.xyz) • [SaaS](https://rivic-q.github.io/cryptobom-saas/) • [Docs](docs-oss/) • [GitHub](https://github.com/rivic-q/cryptobom-saas)

© 2026 Rivic. All rights reserved.
