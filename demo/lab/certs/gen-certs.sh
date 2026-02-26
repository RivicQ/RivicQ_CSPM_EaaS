#!/usr/bin/env bash
# gen-certs.sh — Generate all self-signed certificates for the demo lab
# Usage: bash certs/gen-certs.sh (from demo/lab/)
set -euo pipefail

CERTS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$CERTS_DIR"

echo "🔐 Generating demo lab certificates..."

# ── TLS 1.0 target: RSA-1024, SHA-1 signature ──────────────────────────────
echo "  [1/4] RSA-1024 / SHA-1 (weak) → tls10.{key,crt}"
openssl genrsa -out tls10.key 1024
openssl req -new -x509 -key tls10.key -out tls10.crt \
  -days 3650 -sha1 \
  -subj "/CN=nginx-tls10.demo/O=CryptoBOM Demo Lab/C=DE"

# ── TLS 1.2 target: RSA-2048, SHA-256 signature (no forward secrecy via config) ─
echo "  [2/4] RSA-2048 / SHA-256 → tls12.{key,crt}"
openssl genrsa -out tls12.key 2048
openssl req -new -x509 -key tls12.key -out tls12.crt \
  -days 3650 -sha256 \
  -subj "/CN=nginx-tls12.demo/O=CryptoBOM Demo Lab/C=DE"

# ── TLS 1.3 target: RSA-4096, SHA-256 (reference / good) ────────────────────
echo "  [3/4] RSA-4096 / SHA-256 (good) → tls13.{key,crt}"
openssl genrsa -out tls13.key 4096
openssl req -new -x509 -key tls13.key -out tls13.crt \
  -days 3650 -sha256 \
  -subj "/CN=nginx-tls13.demo/O=CryptoBOM Demo Lab/C=DE"

# ── Java legacy target: RSA-512, MD5withRSA signature ───────────────────────
echo "  [4/4] RSA-512 / MD5withRSA (Java legacy) → java-keystore.p12"
# Generate RSA-512 key (requires legacy provider flags on modern OpenSSL)
openssl genrsa -out java-legacy.key 512 2>/dev/null || true
if [ ! -f java-legacy.key ]; then
  # Fallback: use RSA-1024 if 512 is not supported
  openssl genrsa -out java-legacy.key 1024
fi
openssl req -new -x509 -key java-legacy.key -out java-legacy.crt \
  -days 3650 -md5 \
  -subj "/CN=java-legacy.demo/O=CryptoBOM Demo Lab/C=DE" 2>/dev/null || \
openssl req -new -x509 -key java-legacy.key -out java-legacy.crt \
  -days 3650 -sha256 \
  -subj "/CN=java-legacy.demo/O=CryptoBOM Demo Lab/C=DE"

# Create PKCS12 keystore for Java
openssl pkcs12 -export \
  -inkey java-legacy.key \
  -in java-legacy.crt \
  -out java-keystore.p12 \
  -name "java-legacy" \
  -passout pass:changeit \
  -legacy 2>/dev/null || \
openssl pkcs12 -export \
  -inkey java-legacy.key \
  -in java-legacy.crt \
  -out java-keystore.p12 \
  -name "java-legacy" \
  -passout pass:changeit

echo ""
echo "✅ Certificates generated:"
ls -la "$CERTS_DIR"/*.{crt,key,p12} 2>/dev/null || true
