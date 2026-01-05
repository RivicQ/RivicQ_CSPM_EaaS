# Getting Started with Rivic Q-Runtime

## 📦 Installation

Choose your preferred installation method:

### Option 1: NPM (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/rivic/q-runtime.git
cd q-runtime

# Install dependencies
npm install

# Verify installation
npm run test

# Start the operator
npm run dev:operator
```

### Option 2: Docker

```bash
# Pull the latest image
docker pull rivic/q-runtime:latest

# Run the container
docker run -it \
  -e RIVIC_ENV=development \
  -e RIVIC_EDITION=opensource \
  -p 5000:5000 \
  rivic/q-runtime:latest

# Check logs
docker logs <container-id>
```

### Option 3: Kubernetes (Production)

```bash
# Apply the OSS manifests
kubectl apply -f k8s/manifests-oss.yaml

# Wait for deployment
kubectl wait --for=condition=available \
  --timeout=300s \
  deployment/rivic-operator \
  -n rivic-system

# Verify
kubectl get pods -n rivic-system
```

## 🚀 Quick Start

After installation, start with these steps:

### Step 1: Verify Installation
```bash
npm run test
# Should see: ✅ 15/15 tests passing
```

### Step 2: Start the Demo
```bash
npm run demo:start
# Opens http://localhost:3000
```

### Step 3: Generate CBOM
```bash
npm run cbom:generate
# Creates cbom-report.json in current directory
```

### Step 4: Check Operator Status
```bash
npm run dev:operator:oss
# Should show "Operator initialized successfully"
```

## 📚 Next Steps

1. **[Architecture Overview](architecture.md)** - Understand how Rivic works
2. **[Configuration Guide](../guides/custom-policies.md)** - Customize for your use case
3. **[Kubernetes Deployment](../guides/kubernetes-deployment.md)** - Deploy to production
4. **[API Reference](../api-reference/cbom-api.md)** - Integrate with your apps

## ✅ Verification Checklist

- [ ] Installation completed without errors
- [ ] Tests passing (15/15)
- [ ] Demo app running on localhost:3000
- [ ] CBOM report generated
- [ ] Operator logs showing activity

## ❓ Troubleshooting

**Node.js version mismatch?**
```bash
node --version  # Should be 18.0.0 or higher
nvm install 18  # Install if needed
```

**Docker not starting?**
```bash
docker run -it rivic/q-runtime:latest bash
# Debug inside the container
```

**Kubernetes deployment stuck?**
```bash
kubectl describe pod -n rivic-system
# Check events for error details
```

See [Troubleshooting Guide](../advanced/troubleshooting.md) for more help.

---

**Need help?**
- 💬 [GitHub Discussions](https://github.com/rivic/q-runtime/discussions)
- 🐛 [Report Issues](https://github.com/rivic/q-runtime/issues)
- 📧 [Email Support](mailto:community@rivic.eu)
