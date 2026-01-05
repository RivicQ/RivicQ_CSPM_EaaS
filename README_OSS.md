# 🔒 Rivic Q-Runtime - Open Source Edition

## Quantum-Safe Cloud-Native Infrastructure

A production-ready post-quantum cryptography framework for secure cloud-native applications with zero code changes required.

---

## ✨ Features

- **Post-Quantum Cryptography**: NIST-approved ML-KEM and ML-DSA algorithms
- **Transparent Integration**: Zero application changes required
- **Kubernetes Native**: Cloud-native operators and controllers
- **Cryptographic Observability**: Real-time CBOM (Cryptographic Bill of Materials) generation
- **Compliance Ready**: eIDAS 2.0 and DORA regulation support
- **High Performance**: <100ms encryption operations

---

## 🚀 Quick Start

### Installation

```bash
npm install @rivic/q-runtime
```

### Basic Usage

```typescript
import { RivicOperator } from './src/operator/rivic-operator';

const operator = new RivicOperator({
  edition: 'opensource',
  environment: 'production'
});

await operator.initialize();
```

### Docker

```bash
docker build -t rivic/q-runtime-oss:v1.0.0 \
  --build-arg EDITION=opensource .

docker run -e RIVIC_EDITION=opensource rivic/q-runtime-oss:v1.0.0
```

### Kubernetes

```bash
kubectl apply -f k8s/manifests-oss.yaml
```

---

## 📚 Documentation

### Core Concepts
- [Getting Started](docs-oss/getting-started/installation.md)
- [Architecture Overview](docs-oss/README.md)
- [API Reference](API_REFERENCE.md)

### Guides
- [Post-Quantum Cryptography Setup](docs-oss/getting-started/)
- [Kubernetes Deployment](k8s/)
- [CBOM Generation](src/cbom/)

---

## 🏗️ Project Structure

```
rivic-q-runtime/
├── src/
│   ├── operator/          # Kubernetes operator implementation
│   ├── cbom/              # CBOM generation engine
│   └── interceptor/       # Transparent crypto interception
├── k8s/
│   ├── manifests-oss.yaml # Open source Kubernetes manifests
│   └── manifests.yaml     # Standard manifests
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── docs-oss/              # Open source documentation
└── saas-website/          # Marketing website
```

---

## 🔧 Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Cryptography**: LibQuantum, OpenSSL 3.x
- **Orchestration**: Kubernetes 1.20+
- **Testing**: Jest
- **Container**: Docker

---

## 📋 API Endpoints

### REST API

```
GET    /health              - Health check
POST   /crypto/encrypt      - Encrypt data
POST   /crypto/decrypt      - Decrypt data
GET    /metrics             - Prometheus metrics
GET    /cbom                - Generate CBOM
```

### WebSocket

```
ws://host:8080/streams    - Real-time metric streams
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test -- --coverage
```

---

## 🔒 Security

This project implements security best practices:

- ✅ Post-quantum cryptography (NIST standards)
- ✅ Secure defaults (no plaintext keys)
- ✅ Input validation
- ✅ CORS properly configured
- ✅ Rate limiting
- ✅ Audit logging

### Reporting Security Issues

**Do NOT open public issues for security vulnerabilities.**

Email: security@rivic.xyz

---

## 📊 Performance

Benchmarks on modern hardware:

- ML-KEM Key Generation: ~2ms
- ML-KEM Encapsulation: ~0.8ms
- ML-DSA Signing: ~3.5ms
- ML-DSA Verification: ~1.2ms

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

### Development Setup

```bash
npm install
npm run build
npm run test
```

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- **Documentation**: [docs-oss/](docs-oss/)
- **Issues**: [GitHub Issues](https://github.com/rivic-q/cryptobom-saas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rivic-q/cryptobom-saas/discussions)

---

## 🎯 Roadmap

- [ ] Hardware acceleration support (TPM)
- [ ] Additional PQC algorithms
- [ ] Service mesh integration
- [ ] Multi-cloud support
- [ ] Extended CBOM formats

---

## 🙏 Acknowledgments

- NIST for post-quantum cryptography standards
- Kubernetes community for orchestration patterns
- Contributors and maintainers

---

## 📈 Status

| Component | Status | Version |
|-----------|--------|---------|
| Core Operator | ✅ Stable | 1.0.0 |
| CBOM Generator | ✅ Stable | 1.0.0 |
| Interceptor | ✅ Stable | 1.0.0 |
| Kubernetes CRDs | ✅ Stable | v1 |
| Test Coverage | ✅ 85%+ | - |

---

## 🌟 Star History

If you find this project useful, please star it! ⭐

---

**Made with ❤️ by the Rivic Team**

[Website](https://rivic.xyz) • [Documentation](docs-oss/) • [GitHub](https://github.com/rivic-q/cryptobom-saas)

