# CryptoBOM SaaS Source Code

This directory contains the main source code for CryptoBOM SaaS.

## 📁 Structure

```
src/
├── cmd/              # Command-line applications
│   ├── server/       # Main API server
│   └── cli/          # CLI tools
├── internal/         # Internal packages
│   ├── engine/       # Core engine implementations
│   ├── providers/    # Quantum providers
│   └── discovery/    # Asset discovery
├── api/             # API handlers and routes
├── config/          # Configuration management
├── middleware/      # HTTP middleware
├── services/        # Business logic services
└── utils/           # Utility functions
```

## 🏗️ Architecture

CryptoBOM SaaS follows a clean architecture pattern:

1. **API Layer** - HTTP handlers and routing
2. **Service Layer** - Business logic
3. **Engine Layer** - Core cryptography analysis
4. **Provider Layer** - Quantum provider integrations

## 📦 Building

```bash
# Build the server
go build -o bin/cryptobom-server ./src/cmd/server

# Build CLI
go build -o bin/cryptobom-cli ./src/cmd/cli

# Run
./bin/cryptobom-server
```

## 🧪 Testing

```bash
go test ./src/... -v
```

---

**© 2026 RivicQ GmbH. All Rights Reserved.**
