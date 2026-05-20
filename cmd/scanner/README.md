CBOM Scanner (Demo)
===================

This is a minimal scanner client that posts scan requests to the CryptoBOM
API. It's a demo scaffold for integrating a scanner worker into the platform.

Build and run locally:

```bash
cd cmd/scanner
go build -o scanner ./
SCANNER_API_BASE=http://localhost:5000/api/v1 ./scanner -target=localhost
```

Docker (build & run):

```bash
docker build -t cryptobom-scanner:demo -f cmd/scanner/Dockerfile .
docker run --rm -e SCANNER_API_BASE=http://host.docker.internal:5000/api/v1 cryptobom-scanner:demo -target localhost
```

Replace `SCANNER_API_BASE` with the staging or production API when available.