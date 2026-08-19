# CBOM scanner client

Minimal worker that posts scan requests to a RivicQ **Community** (`:8080`) or **Enterprise** (`:9090`) API.

This is a scaffold for integrating a scanner worker. Prefer the supported CLI:

```bash
make build-rivicq
./bin/rivicq scan .
```

Build this worker:

```bash
cd cmd/scanner
go build -o scanner ./
SCANNER_API_BASE=http://localhost:8080/api/v1 ./scanner -target=localhost
```

License: Apache-2.0 with the rest of the Community tree. See [LEGAL.md](../../LEGAL.md).
