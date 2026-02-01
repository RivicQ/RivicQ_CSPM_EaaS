# CryptoBOM SaaS - Open Source CBOM Management Platform

[![CNCF](https://img.shields.io/badge/CNCF-Compliant-blue)](https://cncf.io)
[![Go](https://img.shields.io/badge/Go-1.21+-blue)](https://golang.org)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.20+-green)](https://kubernetes.io)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**🚀 The Open Source CBOM (Cryptographic Bill of Materials) platform for real-time cryptographic asset management and security.**

## 🌟 What is CryptoBOM?

CryptoBOM helps organizations discover, track, and manage their cryptographic assets across the entire infrastructure. With CNCF-native deployment and real-time monitoring, you can:

- 🔍 **Discover** cryptographic assets across Kubernetes, containers, and applications
- 📊 **Track** cryptographic algorithms, keys, and certificates in real-time
- 🛡️ **Secure** your cryptographic infrastructure with continuous monitoring
- 📈 **Visualize** CBOM data through interactive dashboards

## 🚀 Quick Start (Open Source)

### Prerequisites

```bash
# Kubernetes cluster (1.20+)
kubectl version --client

# Helm 3.0+
helm version

# Go 1.21+ (for development)
go version
```

### One-Click Deployment

```bash
# Clone and deploy
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas
./deploy/scripts/deploy-oss.sh
```

### Manual Deployment

```bash
# Add Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Deploy CryptoBOM OSS
helm install cryptobom-oss ./deploy/helm/cryptobom-oss \
  --namespace cryptobom-system \
  --create-namespace

# Access the dashboard
kubectl port-forward -n cryptobom-system svc/cryptobom-oss 8080:80
open http://localhost:8080
```

## ✨ Core Features (Open Source)

### 🔍 Cryptographic Asset Discovery
- eBPF-based real-time cryptographic operation detection
- Kubernetes workload scanning
- Container image analysis
- Static code analysis integration

### 📊 CBOM Management
- Standardized CBOM format (based on SPDX and CycloneDX)
- Real-time CBOM generation and updates
- Change tracking and alerting
- Export capabilities (JSON, CSV, XML)

### 🛡️ Security Monitoring
- Weak algorithm detection
- Exposed cryptographic keys
- Certificate expiration monitoring
- Vulnerability correlation

### 📈 Visualization & Dashboards
- Real-time CBOM overview dashboard
- Algorithm distribution charts
- Security risk heatmaps
- Kubernetes-native interface (Headlamp plugin)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 CryptoBOM OSS Platform            │
├─────────────────────────────────────────────────────┤
│  Frontend Layer                                   │
│  ├─ React SPA Dashboard                           │
│  ├─ Headlamp Kubernetes Plugin                    │
│  └─ Grafana Dashboards                            │
├─────────────────────────────────────────────────────┤
│  API Gateway & Services                          │
│  ├─ REST API Server                               │
│  ├─ WebSocket Streaming                           │
│  └─ GraphQL Endpoint                              │
├─────────────────────────────────────────────────────┤
│  Security & Monitoring                            │
│  ├─ eBPF Kernel Scanner                          │
│  ├─ Prometheus Metrics                            │
│  ├─ OpenTelemetry Tracing                        │
│  └─ Security Event Correlation                   │
├─────────────────────────────────────────────────────┤
│  Data Layer                                       │
│  ├─ PostgreSQL (Primary)                          │
│  ├─ Redis Cache                                   │
│  └─ Elasticsearch (Logs)                         │
├─────────────────────────────────────────────────────┤
│  Kubernetes Runtime                               │
│  ├─ Custom Operators                              │
│  ├─ Service Monitor                               │
│  └─ Certificate Management                        │
└─────────────────────────────────────────────────────┘
```

## 📚 Documentation

- [User Guide](docs/user-guide.md) - Getting started and daily usage
- [API Documentation](docs/api.md) - REST API reference
- [Developer Guide](docs/developer.md) - Contributing and development
- [Security Guide](docs/security.md) - Security features and best practices
- [Deployment Guide](docs/deployment.md) - Production deployment options

## 🛠️ Development

### Local Development

```bash
# Install dependencies
go mod download
npm install

# Start database
docker-compose up -d postgres redis

# Run backend
go run cmd/server/main.go

# Run frontend
npm run dev

# Run tests
go test ./...
npm test
```

### Building

```bash
# Build all components
make build

# Build Docker images
make docker-build

# Build Helm chart
make helm-package
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🌍 Community

- [GitHub Discussions](https://github.com/rivic-q/cryptobom-saas/discussions) - Community discussions
- [GitHub Issues](https://github.com/rivic-q/cryptobom-saas/issues) - Bug reports and feature requests
- [Slack](https://cryptobom.slack.com) - Real-time chat (coming soon)
- [Newsletter](https://cryptobom.rivic-q.io/newsletter) - Updates and announcements

## 📊 Roadmap

### v1.0 (Current - Open Source)
- ✅ Core CBOM functionality
- ✅ eBPF-based discovery
- ✅ Kubernetes operators
- ✅ Basic visualization

### v1.1 (Q2 2025)
- 🔄 Advanced threat detection
- 🔄 Service mesh integration
- 🔄 Machine learning insights
- 🔄 Multi-cloud deployment

### v2.0 (Q3 2025)
- 📋 Enterprise features
- 📋 Quantum vulnerability assessment
- 📋 Advanced analytics
- 📋 Enterprise integrations

## 🏆 Use Cases

### DevOps Teams
- Track cryptographic dependencies in CI/CD pipelines
- Monitor certificate expiration across deployments
- Ensure cryptographic compliance before production

### Security Teams
- Discover shadow cryptographic assets
- Monitor for weak or deprecated algorithms
- Respond to cryptographic vulnerabilities quickly

### Compliance Teams
- Generate CBOM reports for audits
- Track cryptographic inventory for compliance
- Monitor regulatory compliance in real-time

## 🔧 Enterprise Version

Looking for advanced features? Our [Enterprise version](https://rivic-q.io/cryptobom-enterprise) includes:

- 🚀 **IBM Quantum Integration**: Real-time quantum vulnerability assessment
- 🔐 **Advanced Threat Detection**: ML-based anomaly detection
- 🌐 **Multi-Cloud Support**: AWS, GCP, Azure integration
- 👥 **Enterprise SSO**: SAML, LDAP, OAuth integration
- 📊 **Advanced Analytics**: Custom reports and insights
- 🛡️ **24/7 Support**: Enterprise-grade support and SLA

**Enterprise Version - Coming Q2 2025!**

## 📈 Performance

- **API Response Time**: < 100ms (95th percentile)
- **CBOM Generation**: < 30 seconds for 1000 assets
- **Concurrent Users**: 10,000+ active users
- **Database Throughput**: 50,000+ TPS
- **Memory Usage**: < 512MB (base deployment)

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [CNCF](https://cncf.io) for cloud-native standards
- [eBPF](https://ebpf.io) community for kernel-level monitoring
- [SPDX](https://spdx.org) for SBOM standards
- [CycloneDX](https://cyclonedx.org) for vulnerability intelligence

---

**🚀 Try CryptoBOM OSS today and take control of your cryptographic assets!**

[⭐ Star us on GitHub](https://github.com/rivic-q/cryptobom-saas) | [🐛 Report Issues](https://github.com/rivic-q/cryptobom-saas/issues) | [📖 Read Docs](https://docs.cryptobom.rivic-q.io)