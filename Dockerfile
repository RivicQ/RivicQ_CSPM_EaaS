# Multi-stage Dockerfile for Rivic Q-Runtime
# Supports both Open Source and Enterprise editions
# Usage: docker build -t rivic/q-runtime:v1.0.0 --build-arg EDITION=enterprise .
#        docker build -t rivic/q-runtime-oss:v1.0.0 --build-arg EDITION=opensource .

ARG EDITION=enterprise

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY demo-banking-app ./demo-banking-app

# Compile TypeScript
RUN npm run build

# Stage 2: Open Source Edition
FROM node:20-alpine AS oss-runtime

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY saas-website ./saas-website
COPY monitoring ./monitoring
COPY api-gateway.js ./

# Create non-root user
RUN addgroup -g 1000 rivic && \
    adduser -D -u 1000 -G rivic rivic && \
    chown -R rivic:rivic /app

USER rivic

EXPOSE 4000 3000 3001 5000

ENV RIVIC_ENV=production \
    RIVIC_EDITION=opensource \
    NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["node", "dist/operator/rivic-operator.js"]

# Stage 3: Enterprise Edition
FROM node:20-alpine AS enterprise-runtime

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for enterprise features)
RUN npm ci && \
    npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY saas-website ./saas-website
COPY monitoring ./monitoring
COPY api-gateway.js ./
COPY k8s ./k8s

# Create non-root user
RUN addgroup -g 1000 rivic && \
    adduser -D -u 1000 -G rivic rivic && \
    chown -R rivic:rivic /app

USER rivic

EXPOSE 8443 8080 4000 3000 3001 5000

ENV RIVIC_ENV=production \
    RIVIC_EDITION=enterprise \
    NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/healthz', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["node", "dist/operator/rivic-operator.js"]

# Final Stage: Select based on EDITION build arg
FROM ${EDITION}-runtime as final

LABEL maintainer="Rivic Team <engineering@rivic.eu>" \
      description="Quantum-safe banking infrastructure for EU banking sector" \
      version="1.0.0" \
      edition="${EDITION}" \
      quantum-safe="true" \
      eidas2_0="true" \
      dora="true"