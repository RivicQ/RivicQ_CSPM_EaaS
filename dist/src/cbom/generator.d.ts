/**
 * CBOM (Cryptography Bill of Materials) Generator
 * Compliant with CycloneDX 1.6 specification
 */
export interface CryptoAsset {
    name: string;
    type: 'algorithm' | 'certificate' | 'key' | 'protocol';
    algorithm?: {
        variant: string;
        nistQuantumSecurityLevel?: number;
        classicalSecurityLevel: number;
        cryptographicFunction: 'keygen' | 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'keyExchange';
    };
    certificate?: {
        subjectName: string;
        issuerName: string;
        notValidBefore: string;
        notValidAfter: string;
        publicKeyAlgorithm: string;
    };
    usage: string[];
    location: string;
    quantum_safe: boolean;
}
export interface CBOMDocument {
    bomFormat: 'CycloneDX';
    specVersion: '1.6';
    version: number;
    metadata: {
        timestamp: string;
        component: {
            type: 'application';
            name: string;
            version: string;
        };
    };
    components: Array<{
        type: 'cryptographic-asset';
        name: string;
        cryptoProperties: {
            assetType: 'algorithm' | 'certificate' | 'key' | 'protocol';
            algorithmProperties?: {
                variant: string;
                nistQuantumSecurityLevel?: number;
                classicalSecurityLevel: number;
                cryptographicFunction: string;
            };
        };
    }>;
}
export declare class CBOMGenerator {
    private quantumSafeAlgorithms;
    private algorithmMappings;
    generateForNamespace(namespace: string, algorithms: any): Promise<CBOMDocument>;
    private scanNamespaceAssets;
    private assetToComponent;
    private createAlgorithmComponent;
    generateBuildTimeCBOM(sourcePath: string): Promise<CBOMDocument>;
    validateCBOM(cbom: CBOMDocument): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private isQuantumSafe;
    generateComplianceReport(cbom: CBOMDocument): any;
    private generateRecommendations;
    generateComplianceAudit(): Promise<any>;
}
//# sourceMappingURL=generator.d.ts.map