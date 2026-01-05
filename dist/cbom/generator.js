"use strict";
/**
 * CBOM (Cryptography Bill of Materials) Generator
 * Compliant with CycloneDX 1.6 specification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CBOMGenerator = void 0;
class CBOMGenerator {
    constructor() {
        this.quantumSafeAlgorithms = new Set([
            'kyber-512', 'kyber-768', 'kyber-1024',
            'dilithium-2', 'dilithium-3', 'dilithium-5',
            'ml-kem-512', 'ml-kem-768', 'ml-kem-1024',
            'ml-dsa-44', 'ml-dsa-65', 'ml-dsa-87'
        ]);
        this.algorithmMappings = {
            // Post-Quantum Key Exchange
            'kyber-512': { variant: 'ML-KEM-512', nistLevel: 1, classicalLevel: 128, function: 'keyExchange' },
            'kyber-768': { variant: 'ML-KEM-768', nistLevel: 3, classicalLevel: 192, function: 'keyExchange' },
            'kyber-1024': { variant: 'ML-KEM-1024', nistLevel: 5, classicalLevel: 256, function: 'keyExchange' },
            // Post-Quantum Signatures
            'dilithium-2': { variant: 'ML-DSA-44', nistLevel: 2, classicalLevel: 128, function: 'sign' },
            'dilithium-3': { variant: 'ML-DSA-65', nistLevel: 3, classicalLevel: 192, function: 'sign' },
            'dilithium-5': { variant: 'ML-DSA-87', nistLevel: 5, classicalLevel: 256, function: 'sign' },
            // Legacy algorithms (for migration tracking)
            'rsa-2048': { variant: 'RSA-2048', nistLevel: 0, classicalLevel: 112, function: 'sign' },
            'rsa-4096': { variant: 'RSA-4096', nistLevel: 0, classicalLevel: 128, function: 'sign' },
            'ecdsa-p256': { variant: 'ECDSA-P256', nistLevel: 0, classicalLevel: 128, function: 'sign' },
            'ecdsa-p384': { variant: 'ECDSA-P384', nistLevel: 0, classicalLevel: 192, function: 'sign' },
        };
    }
    async generateForNamespace(namespace, algorithms) {
        console.log(`📊 Generating CBOM for namespace: ${namespace}`);
        const assets = await this.scanNamespaceAssets(namespace);
        const components = assets.map(asset => this.assetToComponent(asset));
        // Add configured quantum-safe algorithms
        if (algorithms) {
            components.push(this.createAlgorithmComponent(algorithms.keyExchange), this.createAlgorithmComponent(algorithms.signature));
        }
        return {
            bomFormat: 'CycloneDX',
            specVersion: '1.6',
            version: 1,
            metadata: {
                timestamp: new Date().toISOString(),
                component: {
                    type: 'application',
                    name: `rivic-namespace-${namespace}`,
                    version: '1.0.0'
                }
            },
            components
        };
    }
    async scanNamespaceAssets(namespace) {
        // In a real implementation, this would scan:
        // 1. Container images for crypto libraries
        // 2. ConfigMaps/Secrets for certificates
        // 3. Running processes for loaded crypto modules
        const mockAssets = [
            {
                name: 'openssl-rsa-key',
                type: 'key',
                algorithm: {
                    variant: 'RSA-2048',
                    classicalSecurityLevel: 112,
                    cryptographicFunction: 'sign'
                },
                usage: ['authentication', 'digital-signature'],
                location: '/etc/ssl/private/server.key',
                quantum_safe: false
            },
            {
                name: 'nginx-tls-cert',
                type: 'certificate',
                certificate: {
                    subjectName: 'CN=banking.example.com',
                    issuerName: 'CN=Internal CA',
                    notValidBefore: '2024-01-01T00:00:00Z',
                    notValidAfter: '2025-12-31T23:59:59Z',
                    publicKeyAlgorithm: 'RSA-2048'
                },
                usage: ['tls-server', 'authentication'],
                location: '/etc/ssl/certs/server.crt',
                quantum_safe: false
            }
        ];
        return mockAssets;
    }
    assetToComponent(asset) {
        const component = {
            type: 'cryptographic-asset',
            name: asset.name,
            cryptoProperties: {
                assetType: asset.type
            }
        };
        if (asset.algorithm) {
            component.cryptoProperties.algorithmProperties = {
                variant: asset.algorithm.variant,
                classicalSecurityLevel: asset.algorithm.classicalSecurityLevel,
                cryptographicFunction: asset.algorithm.cryptographicFunction
            };
            if (asset.algorithm.nistQuantumSecurityLevel) {
                component.cryptoProperties.algorithmProperties.nistQuantumSecurityLevel =
                    asset.algorithm.nistQuantumSecurityLevel;
            }
        }
        return component;
    }
    createAlgorithmComponent(algorithmName) {
        const mapping = this.algorithmMappings[algorithmName];
        if (!mapping) {
            throw new Error(`Unknown algorithm: ${algorithmName}`);
        }
        return {
            type: 'cryptographic-asset',
            name: algorithmName,
            cryptoProperties: {
                assetType: 'algorithm',
                algorithmProperties: {
                    variant: mapping.variant,
                    nistQuantumSecurityLevel: mapping.nistLevel > 0 ? mapping.nistLevel : undefined,
                    classicalSecurityLevel: mapping.classicalLevel,
                    cryptographicFunction: mapping.function
                }
            }
        };
    }
    async generateBuildTimeCBOM(sourcePath) {
        console.log(`🔍 Scanning source code at: ${sourcePath}`);
        // Mock implementation - in production, this would:
        // 1. Parse source files for crypto imports
        // 2. Analyze dependency trees (package.json, go.mod, requirements.txt)
        // 3. Scan container base images
        const detectedAssets = [
            {
                name: 'java-crypto-api',
                type: 'algorithm',
                algorithm: {
                    variant: 'AES-256-GCM',
                    classicalSecurityLevel: 256,
                    cryptographicFunction: 'encrypt'
                },
                usage: ['data-encryption'],
                location: 'src/main/java/banking/CryptoService.java:42',
                quantum_safe: true // AES-256 is quantum-resistant
            },
            {
                name: 'spring-boot-ssl',
                type: 'protocol',
                usage: ['transport-security'],
                location: 'application.yml:server.ssl',
                quantum_safe: false
            }
        ];
        const components = detectedAssets.map(asset => this.assetToComponent(asset));
        return {
            bomFormat: 'CycloneDX',
            specVersion: '1.6',
            version: 1,
            metadata: {
                timestamp: new Date().toISOString(),
                component: {
                    type: 'application',
                    name: 'banking-demo-app',
                    version: '1.0.0'
                }
            },
            components
        };
    }
    async validateCBOM(cbom) {
        const errors = [];
        // Validate format
        if (cbom.bomFormat !== 'CycloneDX') {
            errors.push('Invalid bomFormat, must be "CycloneDX"');
        }
        if (cbom.specVersion !== '1.6') {
            errors.push('Invalid specVersion, must be "1.6"');
        }
        // Validate quantum safety
        const quantumVulnerable = cbom.components.filter(comp => {
            const variant = comp.cryptoProperties.algorithmProperties?.variant;
            return variant && !this.isQuantumSafe(variant);
        });
        if (quantumVulnerable.length > 0) {
            errors.push(`Quantum-vulnerable algorithms detected: ${quantumVulnerable.map(c => c.name).join(', ')}`);
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    isQuantumSafe(algorithm) {
        const lowerAlg = algorithm.toLowerCase();
        // Check if it's a known quantum-safe algorithm
        if (this.quantumSafeAlgorithms.has(lowerAlg)) {
            return true;
        }
        // AES with 256-bit keys is quantum-resistant
        if (lowerAlg.includes('aes-256')) {
            return true;
        }
        // ChaCha20-Poly1305 is quantum-resistant
        if (lowerAlg.includes('chacha20')) {
            return true;
        }
        return false;
    }
    generateComplianceReport(cbom) {
        const totalAssets = cbom.components.length;
        const quantumSafeAssets = cbom.components.filter(comp => {
            const variant = comp.cryptoProperties.algorithmProperties?.variant;
            return variant && this.isQuantumSafe(variant);
        }).length;
        const quantumReadiness = totalAssets > 0 ? (quantumSafeAssets / totalAssets) * 100 : 0;
        return {
            namespace: cbom.metadata.component.name,
            timestamp: cbom.metadata.timestamp,
            summary: {
                totalCryptoAssets: totalAssets,
                quantumSafeAssets,
                quantumVulnerableAssets: totalAssets - quantumSafeAssets,
                quantumReadinessPercentage: Math.round(quantumReadiness)
            },
            compliance: {
                eidas2: quantumReadiness >= 90,
                dora: quantumReadiness >= 80,
                nistRecommended: quantumReadiness >= 100
            },
            recommendations: this.generateRecommendations(cbom)
        };
    }
    generateRecommendations(cbom) {
        const recommendations = [];
        cbom.components.forEach(comp => {
            const variant = comp.cryptoProperties.algorithmProperties?.variant;
            if (variant?.includes('RSA')) {
                recommendations.push(`Migrate ${comp.name} from ${variant} to ML-DSA (Dilithium) for quantum safety`);
            }
            if (variant?.includes('ECDSA')) {
                recommendations.push(`Replace ${comp.name} ECDSA with ML-DSA-65 for post-quantum signatures`);
            }
            if (variant?.includes('ECDH')) {
                recommendations.push(`Upgrade ${comp.name} key exchange to ML-KEM (Kyber) for quantum resistance`);
            }
        });
        if (recommendations.length === 0) {
            recommendations.push('Excellent! All cryptographic assets are quantum-safe.');
        }
        return recommendations;
    }
}
exports.CBOMGenerator = CBOMGenerator;
//# sourceMappingURL=generator.js.map