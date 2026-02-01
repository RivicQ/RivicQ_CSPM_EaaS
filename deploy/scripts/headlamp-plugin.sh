#!/bin/bash

# CryptoBOM SaaS Headlamp Plugin Deployment Script
# This script deploys the Headlamp Kubernetes IDE with CryptoBOM plugin

set -euo pipefail

# Configuration
HEADLAMP_NAMESPACE=${HEADLAMP_NAMESPACE:-"headlamp-system"}
HEADLAMP_VERSION=${HEADLAMP_VERSION:-"v0.63.0"}
CRYPTOBOM_PLUGIN_VERSION=${CRYPTOBOM_PLUGIN_VERSION:-"v1.0.0"}
REGISTRY=${REGISTRY:-"docker.io/rivic-q"}

echo "🔧 Deploying Headlamp with CryptoBOM plugin..."

# Create namespace if it doesn't exist
kubectl create namespace ${HEADLAMP_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Deploy Headlamp
echo "📦 Deploying Headlamp..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: headlamp
  namespace: ${HEADLAMP_NAMESPACE}
  labels:
    app.kubernetes.io/name: headlamp
    app.kubernetes.io/component: ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: headlamp
      app.kubernetes.io/component: ui
  template:
    metadata:
      labels:
        app.kubernetes.io/name: headlamp
        app.kubernetes.io/component: ui
    spec:
      serviceAccountName: headlamp
      containers:
      - name: headlamp
        image: ${REGISTRY}/headlamp:${HEADLAMP_VERSION}
        ports:
        - containerPort: 80
          name: http
        env:
        - name: KUBECONFIG
          value: ""
        - name: PLUGIN_DIR
          value: "/var/lib/headlamp/plugins"
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: plugins
          mountPath: /var/lib/headlamp/plugins
          readOnly: true
      volumes:
      - name: plugins
        emptyDir: {}
      initContainers:
      - name: cryptobom-plugin
        image: ${REGISTRY}/cryptobom-headlamp-plugin:${CRYPTOBOM_PLUGIN_VERSION}
        volumeMounts:
        - name: plugins
          mountPath: /var/lib/headlamp/plugins
        command: ["cp", "-r", "/plugins/.", "/var/lib/headlamp/plugins/"]
EOF

# Create Service
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: headlamp
  namespace: ${HEADLAMP_NAMESPACE}
  labels:
    app.kubernetes.io/name: headlamp
spec:
  selector:
    app.kubernetes.io/name: headlamp
    app.kubernetes.io/component: ui
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
EOF

# Deploy CryptoBOM Headlamp Plugin
echo "🔐 Deploying CryptoBOM Headlamp Plugin..."

# Plugin configuration ConfigMap
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: cryptobom-plugin-config
  namespace: ${HEADLAMP_NAMESPACE}
  labels:
    app.kubernetes.io/name: cryptobom-plugin
data:
  plugin.yaml: |
    name: cryptobom-saas
    version: ${CRYPTOBOM_PLUGIN_VERSION}
    description: "CryptoBOM SaaS - Cryptographic Bill of Materials with Quantum Attestation"
    author: "Rivic-Q"
    license: "Apache-2.0"
    homepage: "https://github.com/rivic-q/cryptobom-saas"
    keywords:
      - security
      - cryptography
      - quantum
      - cbom
      - compliance
    entrypoint: "index.js"
    apis:
      - name: "cryptobom-api"
        description: "CryptoBOM SaaS API"
        version: "v1"
        path: "/api/v1"
    permissions:
      - "read"
      - "write"
      - "admin"
EOF

# Create ServiceAccount and RBAC
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: headlamp
  namespace: ${HEADLAMP_NAMESPACE}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: headlamp
rules:
- apiGroups:
  - ""
  resources:
  - pods
  - services
  - configmaps
  - secrets
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - "apps"
  resources:
  - deployments
  - replicasets
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - "cryptobom.rivic-q.io"
  resources:
  - "*"
  verbs:
  - "*"
- apiGroups:
  - "networking.k8s.io"
  resources:
  - ingresses
  - networkpolicies
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: headlamp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: headlamp
subjects:
- kind: ServiceAccount
  name: headlamp
  namespace: ${HEADLAMP_NAMESPACE}
EOF

# Ingress configuration
if command -v kubectl >/dev/null 2>&1; then
  if kubectl get ingressclass nginx >/dev/null 2>&1; then
    echo "🌐 Creating Ingress for Headlamp..."
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: headlamp
  namespace: ${HEADLAMP_NAMESPACE}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - headlamp.cryptobom.rivic-q.io
    secretName: headlamp-tls
  rules:
  - host: headlamp.cryptobom.rivic-q.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: headlamp
            port:
              number: 80
EOF
  fi
fi

echo "✅ Headlamp with CryptoBOM plugin deployed successfully!"
echo ""
echo "📊 Access Headlamp:"
if kubectl get ingress -n ${HEADLAMP_NAMESPACE} headlamp >/dev/null 2>&1; then
  echo "🔗 https://headlamp.cryptobom.rivic-q.io"
else
  echo "🔗 kubectl port-forward -n ${HEADLAMP_NAMESPACE} svc/headlamp 8080:80"
  echo "🔗 http://localhost:8080"
fi
echo ""
echo "🔐 CryptoBOM SaaS Features in Headlamp:"
echo "  • Real-time CBOM visualization"
echo "  • Quantum attestation dashboard"
echo "  • Cryptographic asset inventory"
echo "  • Compliance monitoring"
echo "  • Security event tracking"
echo "  • Post-quantum migration planning"